# Gemini's Reactium Exploration Plan (v2) - Index

This document serves as an index to the detailed exploration of the Reactium framework.

## Project Directory Overview

-   **cypress:** This directory contains the Cypress tests previously written for the work done in the `learning` directory.
-   **CLI:** This directory contains the clone of the source code for the `reactium` command-line interface (CLI) tool, which is published as the `npx reactium` module. CLI is important to understand the `npx reactium` command.
-   **Reactium-Core-Plugins** This directory contains the clone of the source code for the mono-repo used to populate the core plugins of the Reactium framework (published to the Reactium registry API), and installed by `npx reactium install` into a new projects `reactium_modules` directory (paradigmatically like node_modules and usually git ignored). `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core` is the most important module in the framework. Study it. It alsocontains other important modules that extend reactium-core. reactium-core also extends the cli command, with useful commands for creating components.
-   **reactium-sdk-core** This directory contains the clone of the source code for the @atomic-reactor/reactium-sdk-core npm module which is the basis for the SDK (extended by) reactium-core's SDK. It is important to understand its components and how they relate to Reactium.
-   **Reactium-Admin-Plugins** This directory contains the clone of the source code for the mono-repo used to populate the CMS-like plugins used in the Reactium/Actinium ecosystem. It is good reference material for framework patterns.
-   **Reactium-GraphQL-Plugins** This directory contains the clone of the source code for the mono-repo used to populate the GraphQL API extension of Reactium. It is good reference material for framework patterns.
-   **learning** this is our working directory for learning Reactium. All code goes here in src/app. Use `npx reactium` whenever possible.

## AI's Rules of Engagement (follow rigidly)

1. Challenge assumptions: Before implementing anything ask yourself, "Do I really know from reference material that what I'm doing is likely to work? Or am I just guessing? Should I look in one of the above reference codebases for information first?"
2. Implement: Write code to fully explore the task. Try the contrived example first. Try the advanced technique second.
3. Test: Run the relevant Cypress test to prove the implementation is correct and works as expected. I will not assume success. If the test fails, be curious why. Never assume what you have done is correct already.
4. Document: After, and only after, the test passes, I will document what I have built and what I have learned in the appropriate markdown file.  
   I will not mark tasks as complete until this entire cycle is finished. Thank you for the clarification. I will apply this rule stringently going forward.

## Reactium Exploration Documents

-   **`@atomic-reactor/reactium-sdk-core` Exploration**: [learning/GEMINI/reactium-sdk-core.md](learning/GEMINI/reactium-sdk-core.md)
    -   _Focus_: Foundational understanding of the Reactium SDK's core modules, browser-specific utilities, hooks, and patterns.
    -   _Status_: **Completed**
-   **`@atomic-reactor/reactium-core` Backend Exploration**: [learning/GEMINI/reactium-core-backend.md](learning/GEMINI/reactium/reactium-core-backend.md)
    -   _Focus_: Deep dive into the server-side bootstrap process, Express integration, SSR orchestration, middleware management, and boot hook discovery.
    -   _Status_: **Completed**
-   **`@atomic-reactor/reactium-core` Frontend Exploration**: [learning/GEMINI/reactium-core-frontend.md](learning/GEMINI/reactium-core-frontend.md)
    -   _Focus_: Client-side (SPA) bootstrap, Webpack configuration, client-side routing, dynamic component registration, and manifest construction.
    -   _Status_: **Completed**
-   **Reactium Domain-Driven Design (DDD) Artifacts**: [learning/GEMINI/reactium-ddd-artifacts.md](learning/GEMINI/reactium-ddd-artifacts.md)
    -   _Focus_: Comprehensive understanding of Reactium's DDD artifact types, their purpose, and their role in the framework.
    -   _Status_: **Completed**
-   **Reactium Extensibility Overview**: [learning/GEMINI/reactium-extensibility-overview.md](learning/GEMINI/reactium-extensibility-overview.md)

    -   _Focus_: Clarifying the architectural partitioning of Reactium's extensibility points by backend/frontend and build-time/runtime.
    -   _Status_: **Completed**

-   **Reactium Core Routing Exploration**: [learning/GEMINI/reactium-core-routing-exploration.md](learning/GEMINI/reactium-core-routing-exploration.md)
    -   _Focus_: Deep dive into Reactium's routing mechanism, bootstrap process, and route object features directly from the SDK source.
    -   _Status_: **Completed**

## Phase 2: Building with Reactium

**Objective:** Apply the foundational knowledge to build features and understand the development workflow.

-   **Building Features**: [learning/GEMINI/reactium-building.md](learning/GEMINI/reactium-building.md)
    -   _Focus_: Applying foundational knowledge to build features, create components and routes, and manage state within a Reactium application.
    -   _Status_: **In Progress (Component/Route Created & Verified with Cypress, Analysis of CLI, manifest.js and help complete, now diving deeper into route object features)**
