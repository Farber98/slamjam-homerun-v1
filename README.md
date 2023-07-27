# Slamjam Homerun v1

Contains all the blockchain side logic for Slamjam Homerun v1.


## Program structure

    ├── src                   
    │   ├── constants.rs      # General constants (eg. FEE, COMMISION, TIME_ROUND)
    │   ├── context.rs        # Context definition for each instruction.
    │   ├── errors.rs         # Custom errors for instructions.
    │   ├── lib.rs            # Instructions definition and implementation (a.k.a "the program")
    │   └── state.rs          # PDA structure that will contain game state

## Setup

Install deps

    ```shell
    yarn install

Build project

    ```shell
    anchor build


## Useful commands for testing

See anchor keys and look for the programID output
    ```shell
    anchor keys list

Run tests
    ```shell
    anchor test

Run local validator
    ```shell
    solana-test-validator

See solana logs
    ```shell
    solana logs --url localhost

Run tests with local validator
    ```shell
    anchor test --skip-local-validator

Run tests in testing environment 
    ```shell
    anchor test -- --features "testing" 