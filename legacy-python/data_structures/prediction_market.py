import random
from dataclasses import dataclass, field
from typing import List, Tuple, Optional


@dataclass
class Prediction:
    question: str
    resolve_step: int
    target: Optional[object] = None
    bets: List[Tuple[object, str, float]] = field(default_factory=list)
    resolved: bool = False
    outcome: Optional[str] = None


class PredictionMarket:
    def __init__(self, dao, treasury, event_bus=None) -> None:
        self.dao = dao
        self.treasury = treasury
        self.event_bus = event_bus
        self.predictions: List[Prediction] = []

    def create_prediction(self, question: str, resolve_step: int, target: object | None = None) -> Prediction:
        prediction = Prediction(question, resolve_step, target)
        self.predictions.append(prediction)
        if self.event_bus:
            self.event_bus.publish(
                "prediction_created",
                step=self.dao.current_step,
                question=question,
                resolve_step=resolve_step,
            )
        return prediction

    def place_bet(self, member, prediction: Prediction, choice: str, amount: float) -> bool:
        if amount <= 0 or member.tokens < amount or prediction.resolved:
            return False
        member.tokens -= amount
        self.treasury.deposit("DAO_TOKEN", amount, step=self.dao.current_step)
        prediction.bets.append((member, choice, amount))
        if self.event_bus:
            self.event_bus.publish(
                "bet_placed",
                step=self.dao.current_step,
                member=member.unique_id,
                question=prediction.question,
                choice=choice,
                amount=amount,
            )
        return True

    def _determine_outcome(self, prediction: Prediction) -> str:
        if prediction.target and hasattr(prediction.target, "status"):
            return "pass" if getattr(prediction.target, "status") == "approved" else "fail"
        return random.choice(["pass", "fail"])

    def resolve_predictions(self, step: int) -> None:
        remaining: List[Prediction] = []
        for pred in self.predictions:
            if pred.resolved or step < pred.resolve_step:
                remaining.append(pred)
                continue
            outcome = self._determine_outcome(pred)
            pred.outcome = outcome
            pred.resolved = True
            winners = [(m, amt) for m, choice, amt in pred.bets if choice == outcome]
            total_pool = sum(amt for _, _, amt in pred.bets)
            total_winning = sum(amt for _, amt in winners)
            if total_winning:
                for member, amt in winners:
                    share = total_pool * (amt / total_winning)
                    gained = self.treasury.withdraw("DAO_TOKEN", share, step=step)
                    member.tokens += gained
            if self.event_bus:
                self.event_bus.publish(
                    "prediction_resolved",
                    step=step,
                    question=pred.question,
                    outcome=outcome,
                )
        self.predictions = remaining
