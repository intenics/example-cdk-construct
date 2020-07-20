import {Alarm, TreatMissingData} from '@aws-cdk/aws-cloudwatch'
import {Construct, Stack, StackProps} from "@aws-cdk/core";
import {ITopic, Topic} from "@aws-cdk/aws-sns";
import {SqsEventSource} from "@aws-cdk/aws-lambda-event-sources";
import {Queue} from "@aws-cdk/aws-sqs";
import {SqsSubscription} from "@aws-cdk/aws-sns-subscriptions";
import {SnsAction} from "@aws-cdk/aws-cloudwatch-actions";
import {Function as LambdaFunction, InlineCode, Runtime} from "@aws-cdk/aws-lambda";

export class ServiceStack extends Stack {
    constructor(scope: Construct, id: string, eventTopicArn: string, alarmingTopicArn: string, props?: StackProps) {
        super(scope, id, props);
        const lambda = this.createWorkerLambda()
        const eventTopic = Topic.fromTopicArn(this, 'SourceTopic', eventTopicArn)
        const alarmingTopic = Topic.fromTopicArn(this, 'AlarmingTopic', alarmingTopicArn)
        const eventQueue = this.createSubscriptionResources(eventTopic, alarmingTopic)
        lambda.addEventSource(new SqsEventSource(eventQueue, {batchSize: 1}))
    }

    createSubscriptionResources(eventTopic: ITopic, alarmingTopic: ITopic) {
        const deadLetterQueue = new Queue(this, 'DeadLetterQueue')
        const eventQueue = new Queue(
            this,
            'EventQueue',
            {
                deadLetterQueue: {
                    queue: deadLetterQueue,
                    maxReceiveCount: 3
                }
            }
        )

        eventTopic.addSubscription(new SqsSubscription(eventQueue))

        new Alarm(
            this,
            'EventQueueSize',
            {
                evaluationPeriods: 1,
                metric: eventQueue.metricApproximateNumberOfMessagesVisible(),
                threshold: 5000,
                treatMissingData: TreatMissingData.IGNORE
            }
        ).addAlarmAction(new SnsAction(alarmingTopic))

        new Alarm(
            this,
            'DeadLetterQueueSize',
            {
                evaluationPeriods: 1,
                metric: deadLetterQueue.metricApproximateNumberOfMessagesVisible(),
                threshold: 1,
                treatMissingData: TreatMissingData.IGNORE
            }
        ).addAlarmAction(new SnsAction(alarmingTopic))

        return eventQueue
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
