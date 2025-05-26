from data_structures.proposal import Proposal
from data_structures.dao import DAO

import random


def create_random_proposal(dao: DAO, creator=None, title_prefix: str = "Proposal", topic="Default Topic", project=None):
    proposal_id = len(dao.proposals)
    title = f"{title_prefix} {proposal_id}"
    description = f"This is the description for {title}."
    funding_required = round(random.uniform(1, 100), 2)
    duration = random.randint(1, 12)

    return Proposal(
        dao=dao,
        creator=creator,
        title=title,
        description=description,
        funding_goal=funding_required,
        duration=duration,
        topic=topic,
        project=project,
    )


def submit_random_proposal(dao: DAO, creator):
    proposal = create_random_proposal(dao, creator)
    creator.submit_proposal(dao, proposal)
    return proposal

