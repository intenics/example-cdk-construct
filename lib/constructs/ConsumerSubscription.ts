import {ITopic} from "@aws-cdk/aws-sns";
import {Construct} from "@aws-cdk/core";
import {Queue} from "@aws-cdk/aws-sqs";
import {Alarm, TreatMissingData} from "@aws-cdk/aws-cloudwatch";
import {SqsSubscription} from "@aws-cdk/aws-sns-subscriptions";
import {SnsAction} from "@aws-cdk/aws-cloudwatch-actions";


export interface ConsumerSubscriptionProps {
    eventTopic: ITopic,
    alarmingTopic: ITopic,
    dlqSizePeriod?: number
    dlqSizeThreshold?: number
    dlqRetry?: number
    queueSizePeriod?: number
    queueSizeThreshold?: number
}

export class ConsumerSubscription extends Construct {
    eventQueue: Queue
    eventQueueSizeAlarm: Alarm
    deadLetterQueue: Queue
    deadLetterQueueSizeAlarm: Alarm
    props: ConsumerSubscriptionProps

    constructor(scope: Construct, id: string, props: ConsumerSubscriptionProps,) {
        super(scope, id);
        this.props = props
        this.createSubscriptionResources()
    }

    createSubscriptionResources() {
        this.deadLetterQueue = new Queue(this, 'DeadLetterQueue')
        this.eventQueue = new Queue(
            this,
            'EventQueue',
            {
                deadLetterQueue: {
                    queue: this.deadLetterQueue,
                    maxReceiveCount: this.props.dlqRetry || 3
                }
            }
        )
        this.props.eventTopic.addSubscription(new SqsSubscription(this.eventQueue))
        this.eventQueueSizeAlarm = new Alarm(
            this,
            'EventQueueSize',
            {
                evaluationPeriods: this.props.queueSizePeriod || 1,
                metric: this.eventQueue.metricApproximateNumberOfMessagesVisible(),
                threshold: this.props.queueSizeThreshold || 5000,
                treatMissingData: TreatMissingData.IGNORE
            }
        )
        this.eventQueueSizeAlarm.addAlarmAction(new SnsAction(this.props.alarmingTopic))

        this.deadLetterQueueSizeAlarm = new Alarm(
            this,
            'DeadLetterQueueSize',
            {
                evaluationPeriods: this.props.dlqSizePeriod || 1,
                metric: this.deadLetterQueue.metricApproximateNumberOfMessagesVisible(),
                threshold: this.props.dlqSizeThreshold || 1,
                treatMissingData: TreatMissingData.IGNORE
            }
        )
        this.deadLetterQueueSizeAlarm.addAlarmAction(new SnsAction(this.props.alarmingTopic))
    }
}