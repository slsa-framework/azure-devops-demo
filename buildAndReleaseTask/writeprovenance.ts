
// custom type for subject
export type hash = {
  sha256: string
}
// custom type for subject artifact data
export type subjectArtifact = {
  name: string;
  digest: hash;
}

const subjectJson: Array<subjectArtifact> = []


/* Format the subject data
 * @subjectData: Map of artifact name and sha256 digest
 */
export async function writeArtifactData (subjectData: Map<string, string>): Promise<Array<subjectArtifact>> {

    try {
        // Iterate through the subjectData
        subjectData.forEach((hash, subject) => 

            // Write the subject data
            subjectJson.push({name: subject, digest: { sha256: hash}})

        )

        return subjectJson;

    } catch (err) {

        throw new Error('writeArtifactData: ' + err);
    }
}


export async function writeArtifactJson (subjectJson: Array<subjectArtifact>,
                                         builderId: string,
                                         buildInvocationId: string,
                                         materialsUri: string,
                                         buildSourceVersion: string,
                                         buildDefinitionName: string): Promise<string> {

    try {

        const buildJson = {
          "_type": "https://in-toto.io/Statement/v0.1",
          "subject": subjectJson,
          "predicateType": "https://slsa.dev/provenance/v0.1",
          "predicate": {
            "builder": {
              "id": builderId
            },
            "metadata": {
              "buildInvocationId": buildInvocationId,
              "completeness": {
                "arguments": true,
                "environment": false,
                "materials": false
              },
              "reproducible": false,
              "buildFinishedOn": new Date()
            },
            "recipe": {
              "type": "https://dev.azure.com/Attestations/ProvenanceGenerator@0",
              "definedInMaterial": 0,
              "entryPoint": buildDefinitionName,
              "arguments": null,
              "environment": null
            },
            "materials": [
              {
                "uri": materialsUri,
                "digest": {
                  "sha1": buildSourceVersion
                }
              }
            ]
          }
        }

        const json = JSON.stringify(buildJson, null, 4);

        return json;

    } catch (err) {

        throw new Error('writeArtifactJson: ' + err);
    }
}
