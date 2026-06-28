import { execSync } from "child_process";
import process from "process";

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
if (!token) {
  console.error("Error: GITHUB_TOKEN or GH_TOKEN environment variable is required.");
  process.exit(1);
}

const args = process.argv.slice(2);
const branchArgIndex = args.indexOf("--branch");
const branch = branchArgIndex !== -1 && args[branchArgIndex + 1] ? args[branchArgIndex + 1] : "main";
const dryRun = args.includes("--dry-run") || args.includes("-n");

function getRepoFromGitRemote() {
  try {
    const url = execSync("git config --get remote.origin.url", { encoding: "utf8" }).trim();
    if (!url) throw new Error("remote.origin.url not configured");
    if (url.startsWith("git@github.com:")) {
      return url.slice("git@github.com:".length).replace(/\.git$/, "");
    }
    if (url.startsWith("https://github.com/")) {
      return url.slice("https://github.com/".length).replace(/\.git$/, "");
    }
    throw new Error(`Unsupported remote URL format: ${url}`);
  } catch (error) {
    throw new Error(`Unable to infer repository from git remote: ${error.message}`);
  }
}

const repository = process.env.GITHUB_REPOSITORY || getRepoFromGitRemote();
if (!repository.includes("/")) {
  console.error(`Error: invalid repository identifier '${repository}'. Expected owner/repo.`);
  process.exit(1);
}

const [owner, repo] = repository.split("/");
const url = `https://api.github.com/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}/protection`;
const payload = {
  required_status_checks: {
    strict: true,
    contexts: ["Test", "Build", "Security"]
  },
  enforce_admins: true,
  required_pull_request_reviews: {
    dismissal_restrictions: {
      users: [],
      teams: []
    },
    dismiss_stale_reviews: true,
    require_code_owner_reviews: false,
    required_approving_review_count: 1
  },
  restrictions: null,
  allow_force_pushes: false,
  allow_deletions: false
};

console.log(`Configuring branch protection for ${owner}/${repo}@${branch}`);
console.log(`API endpoint: ${url}`);
console.log(`Rules:`);
console.log(`  - Require PR reviews`);
console.log(`  - Require status checks to pass: ${payload.required_status_checks.contexts.join(", ")}`);
console.log(`  - Disallow force pushes`);
console.log(`  - Enforce admins`);

if (dryRun) {
  console.log("\nDry run mode. Payload:\n");
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

try {
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const result = await response.text();
  if (!response.ok) {
    console.error(`Failed to configure branch protection: ${response.status} ${response.statusText}`);
    console.error(result);
    process.exit(1);
  }

  console.log("Branch protection updated successfully.");
} catch (error) {
  console.error(`Error configuring branch protection: ${error.message}`);
  process.exit(1);
}
