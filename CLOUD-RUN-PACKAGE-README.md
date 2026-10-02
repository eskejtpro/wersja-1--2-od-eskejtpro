# PlanPasika Cloud Run package

This package contains the `work/v3.0.9-cloud-store` source branch and an Android debug APK built from that checkout.

## Version and artifacts

- Source branch: `work/v3.0.9-cloud-store`
- Source commit at package time: see the package filename and GitHub branch tip.
- Android app version: `3.0.8` (`versionCode` 308)
- APK variant: `debug`, signed with the normal debug signing key; suitable for local installation/testing, not a Play Store release.
- The APK contains the Android client. It does not contain or deploy a Cloud Run service.

## Cloud Run source configuration

In Google Cloud Developer Connect, select this repository and branch `work/v3.0.9-cloud-store`, choose the Node.js buildpack, and set the build context to `/`. Leave the entry point and function target empty so the buildpack uses `package.json` (`build` and `start`).

The server's Firestore store is opt-in. Before deploying, configure `GYMTRACKER_CLOUD_STORE=firestore`, `GYMTRACKER_FIRESTORE_PROJECT_ID`, and `GOOGLE_CLIENT_ID`; `GYMTRACKER_FIRESTORE_DATABASE_ID` is optional. Grant the Cloud Run service identity Firestore access. Review Cloud Run, Cloud Build, Artifact Registry, and Firestore billing for the selected project.

The source branch has not been deployed to Google Cloud. Live Google Sign-In, Firestore persistence, and device behavior remain unverified. Follow `GOOGLE-CLOUD-SERVER-SETUP.md` for the current deployment sequence and checks.
