use near_sdk::{env, near, AccountId, Promise, NearToken};
use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::LookupMap;
use near_sdk::json_types::U128;

#[derive(BorshDeserialize, BorshSerialize, Clone, PartialEq, Debug)]
pub enum Status { Listed, Funded, Disputed, Released }
#[derive(BorshDeserialize, BorshSerialize, Clone, Debug)]
pub struct Installment { amount: u128, due_at: u64, released: bool }
#[derive(BorshDeserialize, BorshSerialize, Clone, Debug)]
pub struct Agreement {
    landlord: AccountId, renter: Option<AccountId>, token: AccountId, rent_ngn: u128,
    description: String, move_in_at: u64, dispute_window_ns: u64, status: Status,
    funded: u128, installments: Vec<Installment>, next_id: u64,
}
#[derive(near_sdk::serde::Serialize)]
#[serde(crate = "near_sdk::serde")]
pub struct AgreementView {
    pub id: u64, pub landlord: AccountId, pub renter: Option<AccountId>, pub token: AccountId,
    pub rent_ngn: U128, pub description: String, pub move_in_at: u64,
    pub status: String, pub funded: U128, pub installment_count: u64, pub released_count: u64,
}
#[near(contract_state)]
#[derive(near_sdk::PanicOnDefault)]
pub struct Hearthold { agreements: LookupMap<u64, Agreement>, next_id: u64, allowed_token: AccountId, arbitrator: AccountId }

#[near]
impl Hearthold {
    #[init]
    pub fn new(allowed_token: AccountId, arbitrator: AccountId) -> Self {
        Self { agreements: LookupMap::new(b"a"), next_id: 0, allowed_token, arbitrator }
    }
    pub fn list_property(&mut self, token: AccountId, rent_ngn: U128, description: String, move_in_at: u64, dispute_window_ns: u64) -> u64 {
        assert_eq!(token, self.allowed_token, "token not allowlisted");
        assert!(rent_ngn.0 > 0, "rent must be positive");
        assert!(!description.trim().is_empty(), "property details required");
        assert!(move_in_at > env::block_timestamp(), "move-in must be in the future");
        assert!(dispute_window_ns > 0, "dispute window required");
        self.next_id += 1;
        self.agreements.insert(&self.next_id, &Agreement { landlord: env::predecessor_account_id(), renter: None, token, rent_ngn: rent_ngn.0, description, move_in_at, dispute_window_ns, status: Status::Listed, funded: 0, installments: vec![], next_id: 0 });
        self.next_id
    }
    pub fn set_schedule(&mut self, id: u64, amounts: Vec<U128>, due_dates: Vec<u64>) {
        let mut a = self.load(id);
        assert_eq!(env::predecessor_account_id(), a.landlord, "landlord only");
        assert_eq!(a.status, Status::Listed, "schedule locked after funding");
        assert!(!amounts.is_empty() && amounts.len() == due_dates.len(), "schedule mismatch");
        assert!(amounts.len() <= 24, "maximum 24 installments");
        let mut rows = Vec::new();
        for (amt, due) in amounts.iter().zip(due_dates.iter()) {
            assert!(amt.0 > 0 && *due >= a.move_in_at, "invalid installment");
            rows.push(Installment { amount: amt.0, due_at: *due, released: false });
        }
        a.installments = rows;
        self.agreements.insert(&id, &a);
    }
    /// NEP-141 ft_transfer_call receiver. Message is a listed agreement ID, or `{"listing_id":N}`.
    /// The first renter transfer against a bare listing binds that renter and creates the exact deposit schedule.
    pub fn ft_on_transfer(&mut self, sender_id: AccountId, amount: U128, msg: String) -> U128 {
        let token = env::predecessor_account_id();
        if token != self.allowed_token || amount.0 == 0 { return amount; }
        let id: u64 = match near_sdk::serde_json::from_str::<near_sdk::serde_json::Value>(&msg) {
            Ok(v) => v.get("listing_id").and_then(|v| v.as_u64()).or_else(|| msg.parse::<u64>().ok()).unwrap_or(0),
            Err(_) => msg.parse::<u64>().unwrap_or(0),
        };
        if id == 0 { return amount; }
        let mut a = match self.agreements.get(&id) { Some(v) => v, None => return amount };
        if a.status != Status::Listed { return amount; }
        if let Some(r) = &a.renter { if *r != sender_id { return amount; } } else { a.renter = Some(sender_id); }
        if a.installments.is_empty() {
            if amount.0 != a.rent_ngn { return amount; }
            a.installments.push(Installment { amount: a.rent_ngn, due_at: a.move_in_at, released: false });
        }
        let required: u128 = a.installments.iter().map(|i| i.amount).sum();
        if amount.0 != required { return amount; }
        a.funded = amount.0;
        a.status = Status::Funded;
        self.agreements.insert(&id, &a);
        U128(0)
    }
    pub fn confirm_move_in(&mut self, id: u64) {
        let a = self.load(id);
        assert_eq!(a.status, Status::Funded, "not releasable");
        assert_eq!(a.renter, Some(env::predecessor_account_id()), "renter only");
        assert!(env::block_timestamp() >= a.move_in_at, "move-in date not reached");
        self.release_due(id, true);
    }
    /// Permissionless after the deadline. A contract cannot wake itself, so a caller must submit this transaction.
    pub fn auto_release(&mut self, id: u64) { self.release_due(id, false); }
    fn release_due(&mut self, id: u64, confirmed: bool) {
        let mut a = self.load(id);
        assert_eq!(a.status, Status::Funded, "not releasable");
        assert!(a.renter.is_some(), "no renter");
        if !confirmed { assert!(env::block_timestamp() >= a.move_in_at.saturating_add(a.dispute_window_ns), "auto-release deadline not reached"); }
        let now = env::block_timestamp();
        let mut payout = 0u128;
        for inst in a.installments.iter_mut() {
            let releasable = if confirmed { now >= inst.due_at } else { now >= inst.due_at && now >= a.move_in_at.saturating_add(a.dispute_window_ns) };
            if !inst.released && releasable { inst.released = true; payout += inst.amount; }
        }
        assert!(payout > 0, "no installment due");
        a.funded -= payout;
        if a.installments.iter().all(|i| i.released) { a.status = Status::Released; }
        let token = a.token.clone(); let landlord = a.landlord.clone();
        self.agreements.insert(&id, &a);
        Promise::new(token).function_call("ft_transfer".to_string(), near_sdk::serde_json::to_vec(&near_sdk::serde_json::json!({"receiver_id": landlord, "amount": payout.to_string()})).unwrap(), NearToken::from_yoctonear(1), near_sdk::Gas::from_tgas(20));
    }
    pub fn open_dispute(&mut self, id: u64, reason: String) {
        let mut a = self.load(id); let who = env::predecessor_account_id();
        assert!(who == a.landlord || Some(who) == a.renter, "party only");
        assert_eq!(a.status, Status::Funded, "not disputable");
        assert!(!reason.trim().is_empty(), "reason required");
        a.status = Status::Disputed; self.agreements.insert(&id, &a);
    }
    /// Demo arbitrator sends the whole remaining escrow to one of the parties, then finalizes.
    pub fn resolve_dispute(&mut self, id: u64, pay_landlord: bool) {
        let mut a = self.load(id); assert_eq!(env::predecessor_account_id(), self.arbitrator, "arbitrator only");
        assert_eq!(a.status, Status::Disputed, "no open dispute");
        let receiver = if pay_landlord { a.landlord.clone() } else { a.renter.clone().expect("renter required") };
        let amount = a.funded; a.funded = 0; a.status = Status::Released;
        for i in a.installments.iter_mut() { i.released = true; }
        self.agreements.insert(&id, &a);
        Promise::new(a.token).function_call("ft_transfer".to_string(), near_sdk::serde_json::to_vec(&near_sdk::serde_json::json!({"receiver_id": receiver, "amount": amount.to_string()})).unwrap(), NearToken::from_yoctonear(1), near_sdk::Gas::from_tgas(20));
    }
    pub fn get_agreement_count(&self) -> u64 { self.next_id }
    pub fn get_agreement(&self, id: u64) -> AgreementView {
        let a = self.load(id);
        AgreementView { id, landlord: a.landlord, renter: a.renter, token: a.token, rent_ngn: U128(a.rent_ngn), description: a.description, move_in_at: a.move_in_at, status: match a.status { Status::Listed=>"listed", Status::Funded=>"funded", Status::Disputed=>"disputed", Status::Released=>"released" }.to_string(), funded: U128(a.funded), installment_count: a.installments.len() as u64, released_count: a.installments.iter().filter(|i| i.released).count() as u64 }
    }
    fn load(&self, id: u64) -> Agreement { self.agreements.get(&id).unwrap_or_else(|| env::panic_str("agreement not found")) }
}

#[cfg(test)]
mod tests {
    use super::*; use near_sdk::test_utils::{accounts, VMContextBuilder}; use near_sdk::{testing_env, NearToken};
    fn ctx(who: AccountId, now: u64) { let mut c=VMContextBuilder::new(); c.current_account_id(accounts(0)).predecessor_account_id(who).block_timestamp(now).attached_deposit(NearToken::from_yoctonear(0)); testing_env!(c.build()); }
    fn token_context(who: AccountId, now: u64) { let mut c=VMContextBuilder::new(); c.current_account_id(accounts(0)).predecessor_account_id(accounts(2)).signer_account_id(accounts(2)).block_timestamp(now).attached_deposit(NearToken::from_yoctonear(0)); testing_env!(c.build()); let _=who; }
    fn setup() -> Hearthold { ctx(accounts(1), 10); Hearthold::new(accounts(2), accounts(3)) }
    fn listing(c: &mut Hearthold) -> u64 { ctx(accounts(1),10); c.list_property(accounts(2),U128(100),"2-bed, Yaba, Lagos".into(),100,20) }
    #[test] fn renter_can_fund_listing_json_id_exactly_once() { let mut c=setup(); let id=listing(&mut c); token_context(accounts(4),20); let msg=near_sdk::serde_json::json!({"listing_id":id,"amount":"100","description":"2-bed, Yaba, Lagos","move_in_at":100,"dispute_window_ns":20}).to_string(); assert_eq!(c.ft_on_transfer(accounts(4),U128(99),msg.clone()).0,99); assert_eq!(c.ft_on_transfer(accounts(4),U128(100),msg).0,0); let view=c.get_agreement(id); assert_eq!(view.status,"funded"); assert_eq!(view.renter,Some(accounts(4))); assert_eq!(view.funded.0,100); assert_eq!(c.ft_on_transfer(accounts(4),U128(100),id.to_string()).0,100); }
    #[test] fn landlord_created_flow_remains() { let mut c=setup(); let id=listing(&mut c); token_context(accounts(4),20); assert_eq!(c.ft_on_transfer(accounts(4),U128(100),id.to_string()).0,0); assert_eq!(c.get_agreement(id).status,"funded"); }
    #[test] fn renter_confirm_and_landlord_cannot_trigger_early_release() { let mut c=setup(); let id=listing(&mut c); token_context(accounts(4),20); c.ft_on_transfer(accounts(4),U128(100),id.to_string()); ctx(accounts(1),119); assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(||c.auto_release(id))).is_err()); ctx(accounts(4),100); c.confirm_move_in(id); assert_eq!(c.get_agreement(id).status,"released"); }
    #[test] fn auto_release_waits_for_deadline_and_permissionless() { let mut c=setup(); let id=listing(&mut c); token_context(accounts(4),20); c.ft_on_transfer(accounts(4),U128(100),id.to_string()); ctx(accounts(5),119); assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(||c.auto_release(id))).is_err()); ctx(accounts(5),120); c.auto_release(id); assert_eq!(c.get_agreement(id).status,"released"); }
    #[test] fn dispute_freezes_release_until_arbitrator() { let mut c=setup(); let id=listing(&mut c); token_context(accounts(4),20); c.ft_on_transfer(accounts(4),U128(100),id.to_string()); ctx(accounts(4),30); c.open_dispute(id,"not as described".into()); ctx(accounts(5),120); assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(||c.auto_release(id))).is_err()); ctx(accounts(3),120); c.resolve_dispute(id,false); assert_eq!(c.get_agreement(id).status,"released"); }
    #[test] fn prefunded_schedule_releases_only_due_installments() { let mut c=setup(); let id=listing(&mut c); ctx(accounts(1),10); c.set_schedule(id,vec![U128(40),U128(60)],vec![100,200]); token_context(accounts(4),20); assert_eq!(c.ft_on_transfer(accounts(4),U128(100),id.to_string()).0,0); ctx(accounts(4),100); c.confirm_move_in(id); assert_eq!(c.get_agreement(id).released_count,1); assert_eq!(c.get_agreement(id).funded.0,60); ctx(accounts(5),220); c.auto_release(id); assert_eq!(c.get_agreement(id).status,"released"); }
}
