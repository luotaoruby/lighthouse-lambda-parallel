const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient();

AWS.config.update({ region: process.env.REGION });

const s3 = new AWS.S3()
const s3Key = (jobId, runId, outputFormat) => {
  `raw_reports/${outputFormat}/jobs/${jobId}/runs/${runId}.${outputFormat}`
}

// Completions across success and error, to compare against total pages
const pageCountCompleted = image =>
  parseInt(image.PageCountSuccess.N, 10) + parseInt(image.PageCountError.N, 10);

async function setDynamoTimestampNow(jobId, attribute) {
  const now = new Date();

  const params = {
    TableName: process.env.TABLE_NAME,
    Key: {
      JobId: jobId
    },
    UpdateExpression: `SET ${attribute} = :val`,
    ExpressionAttributeValues: {
      ":val": now.toISOString()
    },
    ReturnValues: "UPDATED_NEW"
  };

  return ddb.update(params).promise();
}

async function fetchObjectsByJobId(jobId) {
  const s3Params = {
    Bucket: process.env.BUCKET,
    Prefix: `raw_reports/json/jobs/${jobId}/runs/`
  }

  await s3.listObjects(s3Params, (err, data) => {
    if (err) {
      console.log('Error', err)
    } else {
      console.log('Success', data)
    }
  })

  return Promise.resolve()
}

exports.handler = async function(event, context) {
  // We set the batches so that there will only ever be
  // one message received here -- so snag the first
  const record = event.Records[0];

  // We only care about the moment of an item being modified, so we can
  // hook in and ask "did we just finish the job or what"
  if (record.eventName !== "MODIFY") {
    return Promise.resolve();
  }

  const oldPageCountCompleted = pageCountCompleted(record.dynamodb.OldImage);
  const newPageCountCompleted = pageCountCompleted(record.dynamodb.NewImage);
  const totalPageCount = parseInt(
    record.dynamodb.NewImage.PageCountTotal.N,
    10
  );

  const jobJustFinished =
    oldPageCountCompleted !== newPageCountCompleted &&
    newPageCountCompleted >= totalPageCount;

  // For any moment that is NOT the moment of the job having just finished,
  // bail!
  if (!jobJustFinished) {
    return Promise.resolve();
  }

  // Update job state to record how long all the LH runs took
  await setDynamoTimestampNow(
    record.dynamodb.NewImage.JobId.S,
    "LighthouseRunEndTime"
  );

  const jobId = record.dynamodb.NewImage.JobId.S
  await fetchObjectsByJobId(jobId)

  return Promise.resolve();
};
