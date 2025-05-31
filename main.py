# File: dao_simulation/main.py
from dao_simulation import DAOSimulation
from mesa.batchrunner import BatchRunner
from settings import settings


def main():
    fixed_params = {
        "num_developers": settings["num_developers"],
        "num_investors": settings["num_investors"],
        "num_delegators": settings["num_delegators"],
        "num_proposal_creators": settings["num_proposal_creators"],
        "num_validators": settings["num_validators"],
        "num_service_providers": settings["num_service_providers"],
        "num_arbitrators": settings["num_arbitrators"],
        "num_regulators": settings["num_regulators"],
        "num_external_partners": settings["num_external_partners"],
        "num_passive_members": settings["num_passive_members"],
        "comment_probability": settings["comment_probability"],
        "external_partner_interact_probability": settings[
            "external_partner_interact_probability"
        ],
        "violation_probability": settings["violation_probability"],
        "reputation_penalty": settings["reputation_penalty"],
    }

    variable_params = {"steps": range(10, 110, 10)}

    batch_run = BatchRunner(
        DAOSimulation,
        variable_params,
        fixed_params,
        iterations=5,
        max_steps=100,
        model_reporters={"DAO": lambda m: m.dao},
    )

    batch_run.run_all()

    data = batch_run.get_model_vars_dataframe()
    print(data.head())


if __name__ == "__main__":
    main()
