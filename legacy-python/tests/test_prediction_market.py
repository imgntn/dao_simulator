import unittest
import random
from data_structures import DAO, Proposal
from agents.dao_member import DAOMember


class TestPredictionMarket(unittest.TestCase):
    def setUp(self):
        random.seed(0)
        self.dao = DAO("T")
        self.member1 = DAOMember("m1", model=self.dao, tokens=100, reputation=0, location="US")
        self.member2 = DAOMember("m2", model=self.dao, tokens=100, reputation=0, location="US")
        self.dao.add_member(self.member1)
        self.dao.add_member(self.member2)

    def test_prediction_flow(self):
        events = []
        self.dao.event_bus.subscribe("*", lambda event=None, **d: events.append(event))
        proposal = Proposal(self.dao, self.member1, "A", "d", 10, 1)
        self.dao.add_proposal(proposal)
        proposal.status = "approved"
        pred = self.dao.prediction_market.create_prediction("Will A pass?", 1, target=proposal)
        self.dao.prediction_market.place_bet(self.member1, pred, "pass", 10)
        self.dao.prediction_market.place_bet(self.member2, pred, "fail", 10)
        self.dao.current_step = 1
        self.dao.prediction_market.resolve_predictions(1)
        self.assertTrue(pred.resolved)
        self.assertEqual(self.member1.tokens, 110)
        self.assertEqual(self.member2.tokens, 90)
        self.assertEqual(self.dao.treasury.get_token_balance("DAO_TOKEN"), 0)
        self.assertIn("prediction_created", events)
        self.assertIn("bet_placed", events)
        self.assertIn("prediction_resolved", events)


if __name__ == "__main__":
    unittest.main()
