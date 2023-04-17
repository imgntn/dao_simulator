import random
from agents.dao_member import DAOMember
from data_structures.project import Project
from data_structures.proposal import Proposal

# jbp note - idk about work_on_project including voting and comments for service providers.
# they probably dont.  the proposal probs has to pass before they can work on it


class ServiceProvider(DAOMember):
    def __init__(self, unique_id, model, tokens, reputation, location, voting_strategy, service_budget):
        super().__init__(unique_id, model, tokens, reputation, location, voting_strategy)
        self.service_budget = service_budget

    def step(self):
        if random.random() < self.model.service_provider_service_probability:
            self.provide_service()

    def provide_service(self):
        project = self.choose_project_to_work_on()
        if project is not None:
            self.work_on_project(project)

    def choose_project_to_work_on(self):
        # Choose a project that is funded and not yet completed.
        ongoing_projects = [
            proj for proj in self.model.projects if proj.funded and not proj.completed]
        if ongoing_projects:
            return random.choice(ongoing_projects)
        else:
            return None

    def work_on_project(self, project):
        # ServiceProvider works on the project, contributing a portion of their budget.
        service_contribution = min(
            self.service_budget, project.remaining_budget)
        project.remaining_budget -= service_contribution
        self.service_budget -= service_contribution

        # If the project budget is depleted, the project is marked as completed.
        if project.remaining_budget <= 0:
            project.completed = True
            self.model.dao.treasury.update_after_project_completion(project)

        # ServiceProvider votes on the proposal
        self.vote_on_proposal(project.proposal)

        # ServiceProvider leaves a comment on the proposal
        sentiment = 'positive' if project.completed else 'neutral'
        self.add_comment(project.proposal, sentiment)
