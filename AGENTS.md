## arbitrator.py

This is the Arbitrator agent class, which inherits from DAOMember. The step function includes handling disputes, voting on a random proposal, and leaving comments on proposals. The handle_dispute function selects a dispute to arbitrate based on importance and resolves it. If there is a violation, it creates a Violation object and applies the reputation penalty to the involved member.

## delegator.py

This is the Delegator agent class, which inherits from DAOMember. The step function includes delegating support, voting on a random proposal, and leaving comments on proposals. The delegate_support function selects a proposal to delegate tokens to based on importance and updates the delegation budget and the agent's tokens accordingly.

## developer.py

This is the Developer agent class, which inherits from DAOMember. The step function includes working on a project, voting on a random proposal, and leaving comments on proposals. The work_on_project function chooses a project to work on and contributes progress based on the developer's reputation. The choose_project_to_work_on function selects an active project at random to work on.

## investory.py

This is the Investor agent class, which inherits from DAOMember. The step function includes investing in proposals, voting on a random proposal, and leaving comments on proposals. The invest_in_proposal function chooses a proposal to invest in and contributes funds based on the investor's investment_budget. The choose_proposal_to_invest_in function selects an open proposal at random to invest in.

## delegator.py

This is the Delegator agent class, which inherits from DAOMember. The step function includes delegating support to proposals, voting on a random proposal, and leaving comments on proposals. The delegate_support_to_proposal function chooses a proposal to delegate support to and contributes funds based on the delegator's delegation_budget. The choose_proposal_to_delegate_to function selects an open proposal at random to delegate support to.

## developer.py

This is the Developer agent class, which inherits from DAOMember. The step function includes working on a project, voting on a random proposal, and leaving comments on proposals. The work_on_project function chooses a project to work on and contributes work based on the developer's reputation. The choose_project_to_work_on function selects a project at random to work on.

## investor.py

This is the Investor agent class, which inherits from DAOMember. The step function includes investing in a random proposal, voting on a random proposal, and leaving comments on proposals. The invest_in_random_proposal function selects a proposal to invest in, calculates an investment amount based on the investor's budget, and updates the budget accordingly.

## passive_member.py

This is the PassiveMember agent class, which inherits from DAOMember. The step function for a PassiveMember only includes voting on a random proposal, as they don't take an active role in the DAO beyond voting.

## proposal_creator.py

This is the ProposalCreator agent class, which inherits from DAOMember. The step function includes voting on a random proposal, leaving a comment on a random proposal, and creating a new proposal. The create_proposal function generates a proposal with a unique ID, random type, description, amount, and duration, and adds it to the model's proposals list.

## regulator.py

This is the Regulator agent class, which inherits from DAOMember. The step function includes voting on a random proposal, leaving a comment on a random proposal, and ensuring compliance of proposals. The ensure_compliance function checks the compliance of a randomly chosen project and records the result. The ``check_project_compliance`` method now inspects a project's funding goal and duration, flags it for violation when requirements aren't met, and emits a ``compliance_checked`` event on the DAO's event bus.

## service_provider.py

This is the ServiceProvider agent class, which inherits from DAOMember. It has a service_budget attribute that represents the budget available for providing services. The step function includes voting on a random proposal, leaving a comment on a random proposal, and providing services for proposals. The ``provide_services`` function checks if the service_budget is greater than 0 and, if so, offers a service to a randomly chosen proposal. ``offer_service`` now records the service in ``services_provided``, optionally increases the proposal's ``current_funding`` and the provider's reputation, and publishes a ``service_offered`` event.

## validator.py

This is the Validator agent class, which inherits from DAOMember. It has a monitoring_budget attribute that represents the budget available for monitoring projects. The step function includes voting on a random proposal, leaving a comment on a random proposal, and monitoring projects. ``monitor_projects`` selects a project when budget allows and calls ``monitor_project``. The ``monitor_project`` method now compares the project's progress to its duration and raises a ``Dispute`` via the DAO when progress falls behind schedule. Both monitoring and dispute creation emit events (``project_monitored`` and ``project_disputed``).

## auditor.py

This is the Auditor agent class, which inherits from DAOMember. The step function reviews open proposals and flags any with very high funding goals or suspicious descriptions by creating a Dispute. Auditors then vote on a random proposal and may leave a comment.

## trader.py

This is the Trader agent class, which inherits from DAOMember. Traders monitor
the DAO token price and react to market shocks by swapping tokens using the
treasury's liquidity pools. They buy DAO tokens when prices trend upward and
sell when the trend reverses, exercising the liquidity-pool logic.

## rl_trader.py

RLTrader extends Trader with a lightweight Q-learning algorithm. It observes
token price and liquidity depth as state, choosing between buying, selling or
adding/removing liquidity. Rewards are based on realized profit so the agent
gradually favours actions that increase its token holdings.

## adaptive_investor.py

The AdaptiveInvestor extends Investor and tracks the rewards of different
proposal types. Using a simple Q-learning approach it gradually allocates more
funds to proposals that historically improved the DAO token price.

## bounty_hunter.py

This agent searches for approved bounty proposals, completes the task and
withdraws the locked reward from the treasury. Completion events are published
on the DAO's event bus.

## external_partner.py

ExternalPartner represents a third party collaborating with the DAO. Based on a
configurable probability it may propose integrations, partnerships or even
contribute work to a random project.

## liquid_delegator.py

LiquidDelegator picks another member as a representative and forwards all votes
through that representative. It can still comment on proposals while its chosen
delegate casts the actual votes.

## artist.py

The Artist agent mints a new NFT each step and lists it on the marketplace while still taking part in normal DAO voting and commenting.

## collector.py

The Collector agent checks marketplace listings every step and buys any NFTs it can afford using its token balance.

## player_agent.py

PlayerAgent represents a human user. Actions such as voting, commenting,
creating proposals or delegating support are queued via the web API. One action
is processed each simulation step.

## Guilds

Guilds are persistent sub-DAOs formed by members. Each guild has its own treasury and project list. Members may create a guild, join one, or leave their current guild. Guild events are published on the DAO's event bus for dashboards and analytics.

