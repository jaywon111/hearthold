use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::json_types::U128;
use near_sdk::store::{LookupMap, UnorderedMap};
use near_sdk::{env, near_bindgen, AccountId, NearToken, PanicOnDefault};

#[derive(BorshDeserialize, BorshSerialize, Clone, PartialEq)]
#[near(serializers = [json])]
pub enum AgreementType {
    Rent,
    Sale,
}

#[derive(BorshDeserialize, BorshSerialize, Clone)]
pub struct Agreement {
    pub id: u64,
    pub landlord: AccountId,
    pub renter: Option<AccountId>,
    pub token: AccountId,
    pub amount: u128,
    pub move_in_time_ns: u64,
    pub dispute_window_ns: u64,
    pub status: String,
    pub funded_amount: u128,
    pub is_disputed: bool,
    pub dispute_reason: Option<String>,
    pub agreement_type: AgreementType,
    pub seller_handover_confirmed: bool,
    pub buyer_receipt_confirmed: bool,
}

#[near(serializers = [json])]
pub struct AgreementView {
    pub id: u64,
    pub landlord: AccountId,
    pub renter: Option<AccountId>,
    pub token: AccountId,
    pub amount: U128,
    pub move_in_time_ns: u64,
    pub dispute_window_ns: u64,
    pub status: String,
    pub funded_amount: U128,
    pub is_disputed: bool,
    pub dispute_reason: Option<String>,
    pub agreement_type: AgreementType,
    pub seller_handover_confirmed: bool,
    pub buyer_receipt_confirmed: bool,
}

#[near_bindgen]
#[derive(PanicOnDefault, BorshDeserialize, BorshSerialize)]
pub struct Contract {
    pub allowed_token: AccountId,
    pub arbitrator: AccountId,
    pub agreements: UnorderedMap<u64, Agreement>,
    pub next_id: u64,
    pub landlord_ratings: LookupMap<AccountId, Vec<u8>>,
}

#[near_bindgen]
impl Contract {
    #[init]
    pub fn new(allowed_token: AccountId, arbitrator: AccountId) -> Self {
        Self {
            allowed_token,
            arbitrator,
            agreements: UnorderedMap::new(b"a"),
            next_id: 1,
            landlord_ratings: LookupMap::new(b"r"),
        }
    }

    pub fn get_config(&self) -> (AccountId, AccountId) {
        (self.allowed_token.clone(), self.arbitrator.clone())
    }

    pub fn get_arbitrator(&self) -> AccountId {
        self.arbitrator.clone()
    }

    pub fn get_agreement_count(&self) -> u64 {
        self.next_id - 1
    }

    pub fn get_agreement(&self, id: u64) -> Option<AgreementView> {
        self.agreements.get(&id).map(|a| AgreementView {
            id: a.id,
            landlord: a.landlord.clone(),
            renter: a.renter.clone(),
            token: a.token.clone(),
            amount: U128(a.amount),
            move_in_time_ns: a.move_in_time_ns,
            dispute_window_ns: a.dispute_window_ns,
            status: a.status.clone(),
            funded_amount: U128(a.funded_amount),
            is_disputed: a.is_disputed,
            dispute_reason: a.dispute_reason.clone(),
            agreement_type: a.agreement_type.clone(),
            seller_handover_confirmed: a.seller_handover_confirmed,
            buyer_receipt_confirmed: a.buyer_receipt_confirmed,
        })
    }

    #[payable]
    pub fn list_property(
        &mut self,
        amount: u128,
        move_in_time_ns: u64,
        dispute_window_ns: u64,
        agreement_type_str: String,
    ) -> u64 {
        let id = self.next_id;
        self.next_id += 1;

        let agreement_type = if agreement_type_str.to_lowercase() == "sale" {
            AgreementType::Sale
        } else {
            AgreementType::Rent
        };

        let agreement = Agreement {
            id,
            landlord: env::predecessor_account_id(),
            renter: None,
            token: self.allowed_token.clone(),
            amount,
            move_in_time_ns,
            dispute_window_ns,
            status: "listed".to_string(),
            funded_amount: 0,
            is_disputed: false,
            dispute_reason: None,
            agreement_type,
            seller_handover_confirmed: false,
            buyer_receipt_confirmed: false,
        };

        self.agreements.insert(id, agreement);
        id
    }

    #[payable]
    pub fn ft_on_transfer(
        &mut self,
        sender_id: AccountId,
        amount: U128,
        msg: String,
    ) -> U128 {
        assert_eq!(env::predecessor_account_id(), self.allowed_token, "Invalid token");
        let agreement_id: u64 = msg.parse().expect("Invalid agreement ID");

        let mut agreement = self.agreements.get(&agreement_id).expect("Agreement not found");
        assert_eq!(agreement.status, "listed", "Agreement not listed");
        assert!(!agreement.is_disputed, "Agreement is disputed");

        agreement.renter = Some(sender_id.clone());
        agreement.funded_amount += amount.0;
        agreement.status = "funded".to_string();
        self.agreements.insert(agreement_id, agreement);

        U128(0)
    }

    pub fn confirm_move_in(&mut self, id: u64) {
        let mut agreement = self.agreements.get(&id).expect("Agreement not found");
        let caller = env::predecessor_account_id();

        assert_eq!(Some(caller.clone()), agreement.renter, "Only renter can confirm");
        assert_eq!(agreement.status, "funded", "Must be funded");
        assert!(!agreement.is_disputed, "Agreement is disputed");

        if let AgreementType::Rent = agreement.agreement_type {
            self.release_funds(&mut agreement);
        }
    }

    pub fn confirm_handover(&mut self, id: u64) {
        let mut agreement = self.agreements.get(&id).expect("Agreement not found");
        assert_eq!(env::predecessor_account_id(), agreement.landlord, "Only landlord can confirm handover");
        assert!(matches!(agreement.agreement_type, AgreementType::Sale), "Only for sales");
        
        agreement.seller_handover_confirmed = true;
        self.check_sale_completion(&mut agreement);
    }

    pub fn confirm_receipt(&mut self, id: u64) {
        let mut agreement = self.agreements.get(&id).expect("Agreement not found");
        let caller = env::predecessor_account_id();
        assert_eq!(Some(caller), agreement.renter, "Only renter/buyer can confirm receipt");
        assert!(matches!(agreement.agreement_type, AgreementType::Sale), "Only for sales");

        agreement.buyer_receipt_confirmed = true;
        self.check_sale_completion(&mut agreement);
    }

    pub fn auto_release(&mut self, id: u64) {
        let mut agreement = self.agreements.get(&id).expect("Agreement not found");
        assert_eq!(agreement.status, "funded", "Must be funded");
        assert!(!agreement.is_disputed, "Agreement is disputed");

        let now = env::block_timestamp();
        let deadline = agreement.move_in_time_ns + agreement.dispute_window_ns;
        assert!(now >= deadline, "Deadline not reached");

        self.release_funds(&mut agreement);
    }

    pub fn open_dispute(&mut self, id: u64, reason: String) {
        let mut agreement = self.agreements.get(&id).expect("Agreement not found");
        let caller = env::predecessor_account_id();
        
        let is_landlord = caller == agreement.landlord;
        let is_renter = Some(caller) == agreement.renter;
        assert!(is_landlord || is_renter, "Only parties can dispute");

        agreement.is_disputed = true;
        agreement.dispute_reason = Some(reason);
        agreement.status = "disputed".to_string();
        self.agreements.insert(id, agreement);
    }

    pub fn resolve_dispute(&mut self, id: u64, award_to_landlord: bool) {
        assert_eq!(env::predecessor_account_id(), self.arbitrator, "Only arbitrator can resolve");
        let mut agreement = self.agreements.get(&id).expect("Agreement not found");
        assert!(agreement.is_disputed, "Agreement is not disputed");

        if award_to_landlord {
            self.release_funds(&mut agreement);
        } else {
            let renter = agreement.renter.clone().expect("No renter");
            near_sdk::ext_contract(agreement.token.clone())
                .ft_transfer(renter, U128(agreement.funded_amount), None)
                .with_attached_deposit(NearToken::from_yoctonear(1));
            agreement.status = "refunded".to_string();
            agreement.is_disputed = false;
            self.agreements.insert(id, agreement);
        }
    }

    pub fn rate_landlord(&mut self, id: u64, stars: u8) {
        assert!(stars > 0 && stars <= 5, "Stars must be 1-5");
        let agreement = self.agreements.get(&id).expect("Agreement not found");
        assert_eq!(Some(env::predecessor_account_id()), agreement.renter, "Only renter can rate");
        assert_eq!(agreement.status, "released", "Can only rate after release");

        let mut ratings = self.landlord_ratings.get(&agreement.landlord).unwrap_or_default();
        ratings.push(stars);
        self.landlord_ratings.insert(agreement.landlord.clone(), ratings);
    }

    pub fn get_landlord_rating(&self, landlord: AccountId) -> Option<f64> {
        let ratings = self.landlord_ratings.get(&landlord)?;
        if ratings.is_empty() {
            return None;
        }
        let sum: u32 = ratings.iter().map(|&r| r as u32).sum();
        Some(sum as f64 / ratings.len() as f64)
    }

    fn release_funds(&mut self, agreement: &mut Agreement) {
        near_sdk::ext_contract(agreement.token.clone())
            .ft_transfer(agreement.landlord.clone(), U128(agreement.funded_amount), None)
            .with_attached_deposit(NearToken::from_yoctonear(1));
        
        agreement.status = "released".to_string();
        agreement.is_disputed = false;
        self.agreements.insert(agreement.id, agreement.clone());
    }

    fn check_sale_completion(&mut self, agreement: &mut Agreement) {
        if agreement.seller_handover_confirmed && agreement.buyer_receipt_confirmed {
            self.release_funds(agreement);
        } else {
            self.agreements.insert(agreement.id, agreement.clone());
        }
    }
}
