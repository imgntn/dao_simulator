from .dao_member import DAOMember

class Developer(DAOMember):
    def __init__(self, unique_id, model, tokens, reputation, location, skills, projects):
        super().__init__(unique_id, model, tokens, reputation, location)
        self.skills = skills
        self.projects = projects

    def step(self):
        # Developer actions during a time step
        self.contribute_to_project()

    def contribute_to_project(self):
        # Example implementation
        for project in self.projects:
            if project['status'] == 'active':
                project['progress'] += self.skills[project['skill_required']]
