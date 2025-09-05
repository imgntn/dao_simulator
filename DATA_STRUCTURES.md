## dao.py

The DAO class represents the DAO itself, including its name, proposals, projects, disputes, violations, members, and treasury. It has methods for adding and removing these entities. The treasury attribute is an instance of the Treasury class. The ``distribute_revenue`` method shares revenue with stakers, ``buyback_tokens`` performs treasury buybacks, and ``stake_tokens`` lets members lock tokens for rewards.

## dispute.py

The Dispute class represents a dispute within the DAO. It includes the DAO itself, the parties involved in the dispute, a description of the dispute, and its resolution. The resolve method is used to set the resolution of the dispute.

## project.py

The Project class represents a project within the DAO. It includes the DAO itself, the creator, the title, the description, the funding goal, the project duration, the current funding, a dictionary to track the work done by each member, the project status, and a list of comments. Projects now provide `to_dict`/`from_dict` helpers for guild persistence.

The add_comment method allows members to leave comments on the project, and the update_work_done method updates the work done by a member on the project.

## proposal.py

The Proposal class represents a proposal within the DAO. It includes the DAO itself, the creator, the title, the description, the funding goal, the proposal duration, the related project (if any), the proposal status, a dictionary to track the votes, and a list of comments. Each proposal now carries a stable `unique_id` for logging/persistence and tracking in dashboards. The DAO sets `creation_time` and assigns a `unique_id` when a proposal is added.

The add_vote method allows members to vote on the proposal, and the add_comment method allows members to leave comments on the proposal.

## treasury.py

The Treasury class represents the DAO's treasury, which holds the various assets of the DAO. It includes a dictionary to track the assets and another dictionary for the asset prices. A simple constant-product AMM backs token swaps.

- Liquidity pool operations (`add_liquidity`, `remove_liquidity`, `swap`) accept a `step` parameter. Events emitted by the pool (`liquidity_added`, `liquidity_removed`, `token_swap`) now include the originating `step` for accurate timelines.
- A `holdings` property is provided as a read-only alias of balances for backward compatibility with visualization scripts.

## violation.py

The Violation class represents a violation that has occurred within the DAO, such as a breach of contract or failure to comply with regulations. It stores the violator (the agent responsible for the violation), the project related to the violation, a description of the violation, and a boolean flag indicating whether the violation has been resolved or not. When created by a Regulator or Arbitrator, a `violation_created` event is emitted.

## voting_strategies.py

The voting_strategies.py file contains utility functions related to voting strategies. Here, we have several functions:

random_voting_strategy: This function chooses a random proposal from the list of proposals.
most_popular_voting_strategy: This function chooses the proposal with the highest total votes.
least_popular_voting_strategy: This function chooses the proposal with the lowest total votes.
most_funded_voting_strategy: This function chooses the proposal with the highest funding requested.
least_funded_voting_strategy: This function chooses the proposal with the lowest funding requested.
vote_based_on_budget: Returns true when `proposal.funding_goal <= budget`.

## bridge.py

Defines the `Bridge` class used in multi-DAO mode. It queues token and NFT transfers between DAOs, applying a fee and optional delay before delivery.

## guild.py

Represents persistent sub-DAOs. Each guild has its own treasury and project list and publishes events when members join or leave.

## nft.py

Stores NFT metadata and ownership information for the marketplace. NFTs can be minted, listed and traded by artist and collector agents.

## reputation.py

Tracks member reputation earned from successful projects and penalized by violations. Reputation weights some voting strategies.

## marketing_events.py and market_shock.py

Support scripted marketing campaigns and market shock events used by the event engine.

## prediction_market.py

Implements prediction market logic where members bet DAO tokens on proposal outcomes.
