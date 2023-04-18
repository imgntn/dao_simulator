from dao_simulation.model import DAOSimulation
from dao_simulation.data_structures.dao import DAO
from dao_simulation.agents import (
    Arbitrator,
    Delegator,
    Developer,
    ExternalPartner,
    Investor,
    PassiveMember,
    ProposalCreator,
    Regulator,
    ServiceProvider,
    Validator,
)
from mesa.batchrunner import BatchRunner


def main():
    fixed_params = {
        "num_developers": 5,
        "num_investors": 5,
        "num_delegators": 5,
        "num_proposal_creators": 5,
        "num_validators": 5,
        "num_service_providers": 5,
        "num_arbitrators": 5,
        "num_regulators": 5,
        "num_external_partners": 5,
        "num_passive_members": 5,
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
