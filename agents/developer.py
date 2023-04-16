import random
from agents.dao_member import DAOMember
from data_structures.project import Project

class Developer(DAOMember):
    def __init__(self, unique_id, model, skills=None):
        super().__init__(unique_id, model)
        self.skills = skills if skills is not None else []

    def step(self):
        # Example of a step method in the Developer class
        if random.random() < self.model.developer_contribution_probability:
            self.contribute()

    def contribute(self):
        # Example implementation for the "contribute" function
        project = self.choose_project()
        if project is not None:
            self.work_on_project(project)

    def choose_project(self):
        # Implementation of choosing a project
        relevant_projects = [proj for proj in self.model.projects if set(self.skills).intersection(set(proj.required_skills))]
        if relevant_projects:
            project = random.choice(relevant_projects)
            return project
        else:
            return None

    def work_on_project(self, project):
        # Implementation of working on a project
        progress_made = random.uniform(0.1, 1)  # Arbitrary progress value
        project.progress += progress_made
        if project.progress >= project.completion_goal:
            project.completed = True
