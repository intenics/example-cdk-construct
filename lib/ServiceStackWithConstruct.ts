import {ConsumerSubscription} from "./constructs/ConsumerSubscription";
import {Construct, Stack, StackProps} from "@aws-cdk/core";
import {Topic} from "@aws-cdk/aws-sns";
import {SqsEventSource} from "@aws-cdk/aws-lambda-event-sources";
import {Function as LambdaFunction, InlineCode, Runtime} from "@aws-cdk/aws-lambda";


export class ServiceStackWithConstruct extends Stack {
    constructor(scope: Construct, id: string, eventTopicArn: string, alarmingTopicArn: string,  props?: StackProps) {
        super(scope, id, props);
        const lambda = this.createWorkerLambda()
        const eventTopic = Topic.fromTopicArn(this, 'SourceTopic', eventTopicArn)
        const alarmingTopic = Topic.fromTopicArn(this, 'AlarmingTopic', alarmingTopicArn)
        const subscription = new ConsumerSubscription(
            this,
            'FanoutSubscription',
            {
                eventTopic,
                alarmingTopic
            }
        )
        lambda.addEventSource(new SqsEventSource(subscription.eventQueue, {batchSize: 1}))
    }

    createWorkerLambda() {
        return new LambdaFunction(
            this,
            'Worker',
            {
                code: new InlineCode('exports.handler = async function( event, context){ console.log(event); }'),
                handler: 'index.handler',
                environment: {},
                runtime: Runtime.NODEJS_12_X,
            }
        )
    }
}
