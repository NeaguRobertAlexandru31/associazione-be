#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { StorageStack } from '../lib/stacks/storage-stack';
// import { DataStack } from '../lib/stacks/data-stack'; // temporaneamente disabilitato — DB su Neon
import { AppStack } from '../lib/stacks/app-stack';

const app = new cdk.App();

const env = {
  account: '766443150514',
  region: 'eu-central-1',
};

const stage = app.node.tryGetContext('stage') ?? 'staging';

const storage = new StorageStack(app, `Associazione-Storage-${stage}`, { env, stage });
// const data = new DataStack(app, `Associazione-Data-${stage}`, { env, stage });

const appStk = new AppStack(app, `Associazione-App-${stage}`, {
  env,
  stage,
  mediaBucket:       storage.mediaBucket,
  mediaDistribution: storage.mediaDistribution,
  // vpc, dbSecret, dbEndpoint, dbName: rimossi — DB su Neon
});

appStk.addStackDependency(storage);
