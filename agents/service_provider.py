from .dao_member import DAOMember

class ServiceProvider(DAOMember):
    def __init__(self, unique_id, model, tokens, reputation, location, service_type):
        super().__init__(unique_id, model, tokens, reputation, location)
        self.service_type = service_type

    def step(self):
        # ServiceProvider actions during a time step
        self.provide_service()

    def provide_service(self):
        # Example "legal" implementation
        if self.service_type == "legal":
            projects = self.model.dao.get_active_projects()
            for project in projects:
                project['legal_support'] += 1
