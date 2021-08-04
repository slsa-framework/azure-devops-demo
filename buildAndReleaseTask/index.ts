import tl = require('azure-pipelines-task-lib');
import * as wp from './writeprovenance';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Array for storing list of artifacts to hash
let arrayOfFiles: Array<string>;
// Create dictionary type for artifact and digest to be used to populate the subject
const subjectData = new Map<string, string>();

/**
 * Get Agent.TempDirectory which is a temp folder that is cleaned after each pipeline job.
 * This is where we will store the build.provenance output file.
 */
const tempPath: string = <string>tl.getVariable('Agent.TempDirectory');


async function run() {
    try {
        tl.setResourcePath(path.join(__dirname, 'task.json'));

        // Get path to artifact
        const artifactPath: string = tl.getInput('artifactPath', true)!; // eslint-disable-line @typescript-eslint/no-non-null-assertion

        // ADO documentation on pre-defined variables for Azure Pipelines
        // https://docs.microsoft.com/en-us/azure/devops/pipelines/build/variables
        // https://docs.microsoft.com/en-us/azure/devops/pipelines/process/run-number
        const buildId: string = <string>tl.getVariable('Build.BuildId');
        const buildDefinitionName: string = <string>tl.getVariable('Build.DefinitionName');
        const buildSourceVersion: string = <string>tl.getVariable('Build.SourceVersion');
        const buildRepositoryProvider: string = <string>tl.getVariable('Build.Repository.Provider');
        const buildRepositoryUri: string = <string>tl.getVariable('Build.Repository.Uri');
        const teamFoundationCollectionUri: string = <string>tl.getVariable('System.TeamFoundationCollectionUri');
        const teamProject: string = <string>tl.getVariable('System.TeamProject');

        /*
        BuildUri: vstfs:///Build/Build/167 <- removed
        buildNumber: 20210726.2 <- removed
        teamProject: https://dev.azure.com/gattjoe/ProvenanceGenerator <- removed
        buildRepositoryId: gattjoe/ado-provenance-demo <- removed
        buildRepositoryName: gattjoe/ado-provenance-demo <- removed
        */

        // Prepare the artifact data
        const artifactSubjectData: Map<string, string> = await prepareSubjectData(artifactPath);

        const foo:Array<wp.subjectArtifact> = await wp.writeArtifactData(artifactSubjectData);

        const builderId = (`${teamFoundationCollectionUri}${teamProject}/Attestations`);
        const buildInvocationId = (`${teamFoundationCollectionUri}${teamProject}/_build/${buildId}`);
        const materialsUri = (`${buildRepositoryProvider}+${buildRepositoryUri}`);
        const createJson: string = await wp.writeArtifactJson(foo, builderId, buildInvocationId, materialsUri, buildSourceVersion, buildDefinitionName);
        console.log(createJson);

        try {
            /* eslint-disable-next-line security/detect-non-literal-fs-filename -- Safe as no value holds user input */
            fs.writeFile(path.join(tempPath + '/build.provenance'), createJson, (err) => {
                if (!err) {
                    console.log('done');
                }
            });
        } catch (err) {
            throw new Error (err);
        }

        console.log('##vso[artifact.upload containerfolder=SLSALevel1;artifactname=build.provenance]'+ (path.join(tempPath + '/build.provenance')));

        tl.setResult(tl.TaskResult.Succeeded, "Job succeeded.")

    }
    catch (err) {

        tl.setResult(tl.TaskResult.Failed, err.message);
    }
}

/*
 * Prepare artifact data by creating a key/value dictionary of artifact name and sha256 digest.
 * @artifactPath: User supplied input
 */
async function prepareSubjectData(artifactPath: string): Promise<Map<string, string>> {

    let subject = new Map<string, string>();

    try {
        // Validate artifactPath exists
        if (tl.exist(artifactPath)) {
            // Check to see if the artifactPath is a file
            const file: boolean = await is_file(artifactPath);
            if (file) {
                // This is where i will call out to the functionality
                // that will itemize and hash the file
                tl.debug('prepareSubjectData: ' + `${artifactPath}` + ' is a single artifact.');

                subject = await buildSubjectData(artifactPath);
                
                return subject;

            } else {

                // The artifactPath was a folder, which means we have
                // to iterate through everything in it and build a BOM.
                // TODO: recursively search the path given if additional folders exist
                tl.debug('prepareSubjectData: ' + `${artifactPath}` + ' contains multiple artifacts.')

                try {
                    arrayOfFiles = fs.readdirSync(artifactPath);

                } catch (err) {

                    console.log('prepareSubjectData: ' + err);
                }

                for (const item of arrayOfFiles) {
                    // Get path to file
                    const pathToFile: string = path.resolve(artifactPath, item);
                    const file: boolean = await is_file(pathToFile);

                    if (file) {
                        subject = await buildSubjectData(pathToFile);
                    }
                }

                return subject;
            }
        } else {
            // A bad file or directory was supplied
            throw new Error('prepareSubjectData: Invalid Artifact path.');
        }

    } catch (err) {

        throw new Error('prepareSubjectData: ' + err);

    }
}

/*
 * Check to see if supplied object is a file
 * @fileCandidate: string
 */
async function is_file(fileCandidate: string): Promise<boolean> {

    try {
        /* eslint-disable-next-line security/detect-non-literal-fs-filename -- Safe as we are checking if it is a file or not */
        const stats: fs.Stats = fs.statSync(fileCandidate);

        return stats.isFile();

    } catch (err) {

        throw new Error('is_file: ' + err);
    }
}

/*
 * Build name and hash map of the artifacts
 * @artifact: string
 */
async function buildSubjectData(artifact: string): Promise<Map<string, string>> {
    
    try {

        // Read the data from the artifact
        /* eslint-disable-next-line security/detect-non-literal-fs-filename -- Safe as the file contents are hashed and not returned to the user */
        const fileBuffer = fs.readFileSync(artifact);
        // Hash the data
        const artifactHash = crypto.createHash('sha256');
        artifactHash.update(fileBuffer);
        // Extract the filename from its UNC path
        const artifactName: string = path.basename(artifact);
        // Populate the results
        subjectData.set(artifactName, artifactHash.digest('hex'));

        return subjectData;
        
    } catch (err) {

        throw new Error('buildSubjectData: ' + err);
    }
}

run();