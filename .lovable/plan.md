# Reconnect GitHub Sync to the Selected Repository

## Problem
The Lovable GitHub App is installed on the user's GitHub account, but the specific repository is not selected in the app installation. This blocks the two-way GitHub sync and produces the message: "Lovable can access the account, but this repository is not selected in the app installation. Reconnect and grant Lovable access to this repository, then try again."

## Plan

1. **Identify the current GitHub connection state**
   - Confirm which Lovable GitHub integration is being used (Git sync / two-way sync, not the API connector).
   - Note the repository name that is missing from the installation.

2. **Update the GitHub App installation to include the repository**
   - Open the Lovable GitHub App installation settings on GitHub.
   - Add/select the repository that needs to be synced.
   - Save the installation settings.

3. **Retry the sync action in Lovable**
   - After the repository is selected, attempt the Git sync operation again in the Lovable editor.
   - Verify the sync succeeds or a different error appears.

4. **Fallback: reconnect the GitHub integration if the above fails**
   - If the GitHub App installation still cannot see the repo, disconnect the Lovable GitHub integration and reconnect it.
   - During reconnect, choose the correct account/organization and select the repository.
   - Test the sync again.

## Expected outcome
Lovable can read from and write to the selected GitHub repository, and the error message is resolved.

## Technical notes
- No code changes are required; this is a GitHub App installation permission issue.
- If the project is using the GitHub API connector (not Git sync), the fix would be different and would use Lovable's standard connector reconnect flow. This plan assumes the Git sync / two-way integration based on the error wording.
