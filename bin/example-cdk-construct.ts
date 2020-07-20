import 'source-map-support/register'
import * as cdk from '@aws-cdk/core'
import {ServiceStackWithConstruct} from '../lib/ServiceStackWithConstruct'
import {ServiceStack} from "../lib/ServiceStack";

const account = '0123456789123'
const region = 'eu-central-1'
const alarmingTopicArn = `arn:aws:sns:${region}:${account}:alarming`
const eventTopicArn = `arn:aws:sns:${region}:${account}:alarming`

const app = new cdk.App()

new ServiceStack(
    app,
    'ConsumerServiceA',
    eventTopicArn,
    alarmingTopicArn,
    {env: {account, region}}
)

new ServiceStackWithConstruct(
    app,
    'ConsumerServiceB',
    eventTopicArn,
    alarmingTopicArn,
    {env: {account, region}}
)

