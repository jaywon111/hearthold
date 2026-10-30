/// <reference types="vite/client" />
interface ImportMetaEnv { readonly VITE_CONTRACT_ID?: string; readonly VITE_TOKEN_ID?: string; readonly VITE_ARBITRATOR_ID?: string }
interface ImportMeta { readonly env: ImportMetaEnv }
