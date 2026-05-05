---
name: webstudio-skill-intelligence-check
description: Check installed, eligible, missing, and ClawHub skills before non-trivial WebStudio tasks; recommend/install safe skills according to policy.
---

When to use:
- before complex coding tasks
- before browser automation tasks
- before integration tasks
- before external API tasks
- when a task fails due to missing tool/skill
- before Quality Governor final verdict

Procedure:
1. Check task objective.
2. Run openclaw skills list.
3. Run openclaw skills list --eligible.
4. Run openclaw skills check.
5. Search ClawHub if a missing capability is suspected.
6. Recommend relevant skills.
7. Install only low-risk workspace skills if policy allows.
8. Require approval for risky skills.
9. Update skill registry.

Output:
SKILL INTELLIGENCE CHECK:
- task:
- installedSkillsChecked:
- eligibleSkillsChecked:
- missingRequirements:
- clawhubSearched:
- recommendedSkills:
- installedSkills:
- approvalRequired:
- verdict:
