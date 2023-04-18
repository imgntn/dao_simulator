## proposal_utilities.py

This file contains utility functions to create and submit random proposals. The create_random_proposal function generates a new Proposal with a random funding requirement and duration. The submit_random_proposal function creates a random proposal and submits it to the DAO using the provided creator agent.

## voting_strategies.py

This file contains voting strategies that agents can use to decide whether to vote in favor of or against a proposal. The random_vote function returns a random boolean value. The vote_based_on_budget function compares the proposal's funding requirement to the agent's budget and votes in favor if it is within budget. The vote_based_on_duration function compares the proposal's duration to the agent's maximum acceptable duration and votes in favor if it is within the acceptable duration.
