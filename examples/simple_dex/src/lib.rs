#![no_std]
use soroban_sdk::{contract, contractimpl, Address, Env, Symbol};

#[contract]
pub struct SimpleDex;

#[contractimpl]
impl SimpleDex {
    pub fn swap(env: Env, caller: Address, amount_in: i128, token_in: Address, amount_out: i128, token_out: Address) {
        env.events().publish(
            (Symbol::new(&env, "swap"), caller, token_in, token_out),
            (amount_in, amount_out),
        );
    }
}
