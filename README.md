# Slamjam Homerun v1

Contains all the blockchain side logic for Slamjam Homerun v1.


## Program structure

    ├── src                   
    │   ├── constants.rs      # General constants (eg. FEE, COMMISION, TIME_ROUND)
    │   ├── context.rs        # Context definition for each instruction.
    │   ├── errors.rs         # Custom errors for instructions.
    │   ├── lib.rs            # Instructions definition and implementation (a.k.a "the program")
    │   └── state.rs          # PDA structure that will contain game state