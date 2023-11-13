const { MemoryVectorStore } = require("langchain/vectorstores/memory");
const { OpenAIEmbeddings } = require("langchain/embeddings/openai");
const { PromptTemplate, FewShotPromptTemplate } = require("langchain/prompts");
const { ChatOpenAI } = require("langchain/chat_models/openai");

// Uncomment when using outside of this repo
// const { SemanticLengthExampleSelector, getLengthBased } = require('@whitesmith/langchain-semantic-length-example-selector');
const { SemanticLengthExampleSelector, getLengthBased } = require('../lib/index.js');

/*
 * CONSTANTS
*/

const AZURE_OPENAI_API_KEY = "AZURE_OPENAI_API_KEY";
const AZURE_OPENAI_API_VERSION = "AZURE_OPENAI_API_VERSION";
const AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME = "AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME";
const AZURE_OPENAI_API_GPT4_DEPLOYMENT_NAME = "AZURE_OPENAI_API_GPT4_DEPLOYMENT_NAME";
const AZURE_OPENAI_BASE_PATH = "AZURE_OPENAI_BASE_PATH";

const maxLength = 220;

// EXAMPLE LINKEDIN POSTS GENERATED BY GPT-4
const examples = [
  `Working with distributed teams in different time zones can be tricky, but it also unlocks opportunities for 24/7 productivity. My latest blog post highlights strategies to effectively manage remote teams across the globe. Let's redefine productivity in this digital era! #remote #digitaltransformation #Productivity`,
  `We're thrilled to announce that we'll be hosting our annual Digital Marketing Symposium on February 12th! We've lined up industry innovators and influencers to share insights about SEO, social media, content strategy and more. Don't miss out, register now: [Link] #DigitalMarketing #SEO #SocialMedia`,
  `The recent rollout of 5G technology presents exciting changes ahead for the tech industry. It isn't just about faster internet; it's about shaping infrastructures, re-framing industry paradigms and redesigning the way we communicate. What are your thoughts about this digital leap? #TechNews #5G #DigitalLeap`,
  `As we delve deeper into this new week, remember that success does not lie in results but in efforts. "Being" the best is not so important, "Doing" the best is what matters. Let's strive for progress, not perfection. #MondayMotivation #ProgressNotPerfection`,
  `Exciting news! Our team is growing and we are looking for a talented Senior Data Scientist to join us. We offer competitive salaries, remote-friendly policies, and an opportunity to shape the future of data science. Apply here today: [Link] #JobOpening #DataScience`,
  `We're proud to unveil the latest update to our software! The intuitive new design interface simplifies workflows, enabling you to achieve more in less time. Try it out today and experience a smoother, more efficient work process. #ProductLaunch #SoftwareUpdate`,
  `We are thrilled to share that we've reached a milestone of 500,000 active users on our platform! A big thank you to our dedicated team and loyal users who have made this journey possible. Here's to reaching the next milestone together! #teamwork #achievement`,
  `Please join us in welcoming Jane Doe, our new Director of Sales. Jane brings a wealth of leadership experience and a proven record of growth strategies. We look forward to the innovation she will bring to our team! #NewHire`,
  `It's more than just code and coffee at our firm. It's about passion, innovation, and creating solutions that make a difference. Here's a little sneak peek into an ordinary, yet exhilarating day at our office! #Culture #Innovation`,
  `It was an honor to be part of the panel at the Global Tech Summit this week. Discussing emerging technologies with other leaders in the field was truly inspirational. It's exciting to see the impact of technological advancement on our lives and businesses. #TechSummit #innovation`,
];

const promptPrefix = `Generate a new post using the below posts as reference:`;
const promptSuffix = `You are an expert Linkedin content writter.
I want you to write a draft for a post about ...
The format should be ...
It's important to NOT include ...
The target is ...
DO NOT use bullet points.

Use the following information to extract ...
{content}`;

const exampleContent = `Here are the notes from ...:
<notes>
  - ...
  - ...
</notes>

Here are the notes from ...:
<notes>    
  - ...
  - ...
</notes>`;


(async () => {
  const embeddings = new OpenAIEmbeddings({
    azureOpenAIApiKey: AZURE_OPENAI_API_KEY,
    azureOpenAIApiVersion: AZURE_OPENAI_API_VERSION,
    azureOpenAIApiDeploymentName: AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME,
    azureOpenAIBasePath: AZURE_OPENAI_BASE_PATH,
  });

  const vectorStore = await MemoryVectorStore.fromTexts(
    examples,
    examples.map(e => ({ content: e })),
    embeddings
  );

  const examplePrompt = PromptTemplate.fromTemplate(`<post>\n{content}\n</post>`);

  const exampleSelector = new SemanticLengthExampleSelector({
    vectorStore: vectorStore,
    k: 6, // return up to 6 most similar examples
    inputKeys: ["content"],
    examplePrompt: examplePrompt,
    maxLength: maxLength - getLengthBased(promptPrefix) - getLengthBased(promptSuffix)
  });

  const dynamicPrompt = new FewShotPromptTemplate({
    exampleSelector: exampleSelector,
    examplePrompt: examplePrompt,
    prefix: promptPrefix,
    suffix: promptSuffix,
    inputVariables: ["content"],
  });

  const formattedValue = await dynamicPrompt.format({
    content: exampleContent,
  });
  console.log(formattedValue);

  const model = new ChatOpenAI({
    modelName: 'gpt-4',
    temperature: 0.8,
    azureOpenAIApiKey: AZURE_OPENAI_API_KEY,
    azureOpenAIApiVersion: AZURE_OPENAI_API_VERSION,
    azureOpenAIApiDeploymentName: AZURE_OPENAI_API_GPT4_DEPLOYMENT_NAME,
    azureOpenAIBasePath: AZURE_OPENAI_BASE_PATH
  });
  const chain = dynamicPrompt.pipe(model);
  const result = await chain.invoke({
    content: exampleContent
  });

  console.log(result.content);
})();