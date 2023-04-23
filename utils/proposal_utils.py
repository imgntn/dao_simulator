from data_structures.proposal import Proposal
from data_structures.dao import DAO

import random


def create_random_proposal(dao: DAO, title_prefix: str = "Proposal"):
    proposal_id = len(dao.proposals)
    title = f"{title_prefix} {proposal_id}"
    description = f"This is the description for {title}."
    funding_required = round(random.uniform(1, 100), 2)
    duration = random.randint(1, 12)

    return Proposal(proposal_id, title, description, funding_required, duration)


def submit_random_proposal(dao: DAO, creator):
    proposal = create_random_proposal(dao)
    creator.submit_proposal(dao, proposal)
    return proposal
