import unittest
import os
import tempfile
from dao_simulation import DAOSimulation

class TestReportGeneration(unittest.TestCase):
    def test_html_report_created(self):
        fd, csvf = tempfile.mkstemp(suffix=".csv")
        os.close(fd)
        os.remove(csvf)
        fd, htmlf = tempfile.mkstemp(suffix=".html")
        os.close(fd)
        os.remove(htmlf)
        sim = DAOSimulation(export_csv=True, csv_filename=csvf, report_file=htmlf, num_developers=1, num_investors=0, num_delegators=0, num_proposal_creators=0, num_validators=0, num_service_providers=0, num_arbitrators=0, num_regulators=0, num_external_partners=0, num_passive_members=0, comment_probability=0)
        sim.run(1)
        self.assertTrue(os.path.exists(htmlf))
        with open(htmlf) as f:
            content = f.read()
        self.assertIn("<html", content)
        os.remove(csvf)
        os.remove(htmlf)

if __name__ == "__main__":
    unittest.main()
