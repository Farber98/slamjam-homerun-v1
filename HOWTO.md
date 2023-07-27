0. Install deps
    ```shell
    yarn install

1. Build project
    ```shell
    anchor build

2. See anchor keys and look for the programID output
    ```shell
    anchor keys list

3. Run tests
    ```shell
    anchor test

4. Run local validator
    ```shell
    solana-test-validator

5. See solana logs
    ```shell
    solana logs --url localhost

6. Run tests with local validator
    ```shell
    anchor test --skip-local-validator

7. Run tests in testing environment 
    ```shell
    anchor test -- --features "testing" 