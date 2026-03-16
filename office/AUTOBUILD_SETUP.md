# Unity Auto-Build Setup (GitHub Actions)

Configured:
- `.github/workflows/unity-webgl-deploy.yml`
- `UnityProject/Assets/Editor/BuildScript.cs`

## Required repository secrets
- UNITY_EMAIL
- UNITY_PASSWORD
- UNITY_LICENSE
- VPS_HOST
- VPS_USER
- VPS_SSH_KEY

## Required Unity project files
Actions build will run only when these exist:
- `UnityProject/Assets/`
- `UnityProject/ProjectSettings/ProjectVersion.txt`
- At least one Scene in Build Settings

## Deploy target
- Build => `/var/www/office/Build/`
- TemplateData => `/var/www/office/TemplateData/`

## Notes
Current repo has workflow + build script scaffolding.
If UnityProject is incomplete, build job will fail fast with clear error.
