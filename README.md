# SLSA Azure DevOps Demo

A proof-of-concept SLSA provenance generator for Azure DevOps Pipelines.

## Background

[SLSA](https://github.com/slsa-framework/slsa) is a framework intended to codify and promote secure software supply-chain practices. SLSA helps trace software artifacts (e.g. binaries) back to the build and source control systems that produced them using in-toto's [Attestation](https://github.com/in-toto/attestation/blob/main/spec/README.md) metadata format.

## Description

This proof-of-concept Azure DevOps Pipeline Extension demonstrates an initial SLSA integration conformant with SLSA Level 1. This provenance can be uploaded to the native artifact store or to any other artifact repository.

While there are no integrity guarantees on the produced provenance at L1, publishing artifact provenance in a common format opens up opportunities for automated analysis and auditing. Additionally, moving build definitions into source control and onto well-supported, secure build systems represents a marked improvement from the ecosystem's current state.

### Security and Support

This is demo repo and is not intended to be used in production contexts. As such, we cannot make any commitments of future support.

### YAML Pipeline Example

Below is sample YAML to insert into your build or release pipeline.

```
steps:
- task: gattjoe.SLSAProvenanceGenerator.custom-build-release-task.SLSAProvenanceGenerator@0
  displayName: 'SLSA Provenance Generator'
  inputs:
    artifactPath: dist
```

### Results

The provenance is generated and output to stdout for the task. Additionally, Azure DevOps will publish an immutable artifact titled "build.provenance".

### Agent Requirements

The extension has been updated to use Node 16. As a consequence, the minimum agent version supported is 2.206.1 per [this](https://github.com/microsoft/azure-pipelines-tasks/blob/master/docs/migrateNode16.md) guidance.