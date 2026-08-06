# Below the Bloom

**Below the Bloom** is a cinematic sci-fi survival project about Oyster, a stranded teenage explorer, and Chip, his sarcastic AI companion, descending through a classified alien ocean planet after a violet electromagnetic event crashes their research vessel.

The repository is organized as a GitHub Pages-ready static site with an Actions workflow that publishes the repository root.

## Live site URL

Once GitHub Pages is enabled for this repository, the project will be available at:

```text
https://n8sndh2vr6-wq.github.io/below-the-bloom/
```

## Project structure

```text
.
├── index.html                         # GitHub Pages landing page
├── .github/workflows/pages.yml        # GitHub Actions deployment workflow
├── .nojekyll                           # Serve static files directly
├── assets/css/styles.css              # Landing page styles
├── scripts/chapter-1/                 # Cleaned Chapter 1 scripts, one file per scene
├── content/opening-scenes.md          # Original combined draft archive
├── legacy/Planet_Redacted_Archive_Phase1_v2.html
│                                      # Original archive prototype
└── README.md                          # Project and deployment notes
```

## Deploying with GitHub Pages

1. Push these changes to GitHub.
2. Open the repository on GitHub.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, choose **GitHub Actions** as the source.
5. The workflow in `.github/workflows/pages.yml` will deploy the repository root whenever `main` is updated, or when you manually run it from the Actions tab.

## Creative direction

The landing page frames the project as the **Planet Redacted Archive**, highlighting the core story loop:

- cleaned Chapter 1 script files;
- orbital research mission;
- purple Bloom event;
- submerged wreck survival;
- descent toward the castle, the king, and the crown.
