import random
from agents.dao_member import DAOMember
from data_structures.project import Project

class ServiceProvider(DAOMember):
    def __init__(self, unique_id, model, service_type):
        super().__init__(unique_id, model)
        self.service_type = service_type

    def step(self):
        if random.random() < self.model.service_provider_service_probability:
            self.provide_service()

    def provide_service(self):
        project = self.choose_project()
        if project is not None:
            self.perform_service(project)

    def choose_project(self):
        applicable_projects = [proj for proj in self.model.projects if proj.service_required == self.service_type and not proj.service_completed]
        if applicable_projects:
            return random.choice(applicable_projects)
        else:
            return None

    def perform_service(self, project):
        # Implementation of performing the specific service
        project.service_completed = True

        # Update treasury
        service_fee = project.service_fee
        native_token = self.model.dao.treasury.native_token_name
        if self.model.dao.treasury.holdings[native_token] >= service_fee:
            self.model.dao.treasury.holdings[native_token] -= service_fee
            self.token_holdings[native_token] += service_fee
        else:
            # If there are not enough funds in the treasury, the service is not completed
            project.service_completed = False
