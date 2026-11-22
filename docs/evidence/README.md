# Task 3 Verification Evidence

| Task | Recorded evidence | Source |
| --- | --- | --- |
| B2 | [Coverage log excerpt](b2-coverage.txt) with 9 passing tests, 100% line coverage, and 98.15% branch coverage | [CI run on main](https://github.com/adeniraf/task-3-3-devops-software-eng/actions/runs/45049879179) |
| B3 | [Failed test log](b3-failed-tests.txt) and [passing checks after the fix](b3-passing-run.txt) | [PR and merge](https://github.com/adeniraf/task-3-3-devops-software-eng/pull/7) |
| C1 | [Local Docker smoke-test rerun](c1-smoke-test.txt) showing UID 1000 and successful API checks | [Docker build PR](https://github.com/adeniraf/task-3-3-devops-software-eng/pull/8) |
| C2 | [PR checks screenshot](c2-pr-checks.png) and [Trivy job screenshot](c2-trivy-failure.png) | [CI run](https://github.com/adeniraf/task-3-3-devops-software-eng/actions/runs/45064269994) |
| D2 | [Clean kind rollout and API smoke test](d2-kind-clean-rollout.txt) | [Run that published the deployed image](https://github.com/adeniraf/task-3-3-devops-software-eng/actions/runs/45066938244) |
| D3–D4 | [Automated clean-cluster rollout and digest verification](d4-ci-kind-deployment.txt) | [Deployment run](https://github.com/adeniraf/task-3-3-devops-software-eng/actions/runs/45070009627) |
| E2–E3 | [Grafana dashboard under test traffic](e2-grafana-dashboard.jpg) and [query results, request logs, alert firing, and recovery](e2-e3-monitoring.txt) | [Run that published the instrumented image](https://github.com/adeniraf/task-3-3-devops-software-eng/actions/runs/45070292212) |
