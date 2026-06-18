#![cfg_attr(not(feature = "abi-gen"), no_main, no_std)]

//! statement.dot social registry (PolkaVM, pallet-revive).
//!
//! Durable, tamper-evident binding of a per-Product alias to the dotNS handle
//! it claims + a verified-human flag. The caller (msg.sender) can only ever set
//! its OWN entry, so resolving `handle_of(alias)` on-chain replaces trusting an
//! ephemeral gossip broadcast. Read from the frontend via
//! `@parity/product-sdk-contracts` (see src/sdk/live/index.ts).

#[pvm_contract_sdk::contract(allocator = "pico", allocator_size = 65536)]
mod statement_registry {
    use alloc::string::String;
    use pvm_contract_sdk::{Address, Mapping};

    pub struct StatementRegistry {
        #[slot(0)]
        handles: Mapping<[u8; 20], String>, // account -> dotNS handle
        #[slot(1)]
        human: Mapping<[u8; 20], bool>, // account -> Proof-of-Personhood verified
    }

    impl StatementRegistry {
        #[pvm_contract_sdk::constructor]
        pub fn new(&mut self) {}

        /// Record the caller's handle + human flag. Only the caller's own entry
        /// is ever written — you cannot set someone else's.
        #[pvm_contract_sdk::method]
        pub fn register(&mut self, handle: String, human: bool) {
            let caller = self.caller().0;
            self.handles.insert(&caller, &handle);
            self.human.insert(&caller, &human);
        }

        /// The handle an account registered (empty if none).
        #[pvm_contract_sdk::method]
        pub fn handle_of(&self, account: Address) -> String {
            self.handles.get(&account.0)
        }

        /// Whether an account cleared Proof of Personhood.
        #[pvm_contract_sdk::method]
        pub fn is_human(&self, account: Address) -> bool {
            self.human.get(&account.0)
        }

        fn caller(&self) -> Address {
            let mut buf = [0u8; 20];
            self.host().caller(&mut buf);
            Address(buf)
        }
    }
}
