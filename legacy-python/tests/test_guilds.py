import unittest
from data_structures import DAO
from agents.dao_member import DAOMember

class TestGuilds(unittest.TestCase):
    def setUp(self):
        self.dao = DAO("TestDAO")
        self.member = DAOMember(1, model=self.dao, tokens=100, reputation=10, location="US")
        self.dao.add_member(self.member)

    def test_create_guild(self):
        guild = self.dao.create_guild("Builders", creator=self.member)
        self.assertIn(guild, self.dao.guilds)
        self.assertIn(self.member, guild.members)
        self.assertIs(self.member.guild, guild)

    def test_join_and_leave(self):
        guild = self.dao.create_guild("Designers")
        self.member.join_guild(guild)
        self.assertIs(self.member.guild, guild)
        self.assertIn(self.member, guild.members)
        self.member.leave_guild()
        self.assertIsNone(self.member.guild)
        self.assertNotIn(self.member, guild.members)

    def test_guild_treasury(self):
        guild = self.dao.create_guild("Treasurers")
        guild.deposit("DAO_TOKEN", 50)
        bal = guild.treasury.get_token_balance("DAO_TOKEN")
        self.assertEqual(bal, 50)

if __name__ == "__main__":
    unittest.main()
