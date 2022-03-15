const crypto = require('crypto')
const { generateImageData } = require('gatsby-plugin-image')
const { getGatsbyImageResolver } = require('gatsby-plugin-image/graphql-utils')

// This should be match the configuration on the Drupal side
const PRIVATE_SIGNING_KEY = process.env.IMAGE_SIGNING_KEY ?? 'supersecretsharedkey'

exports.createPages = async ({ actions }) => {
  const { createPage } = actions
  createPage({
    path: "/using-dsg",
    component: require.resolve("./src/templates/using-dsg.js"),
    context: {},
    defer: true,
  })
}

const makeBase64UrlSafe = (b64) => (
  b64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
)

const urlSafeBase64 = (str) => makeBase64UrlSafe(Buffer.from(str, 'ascii').toString('base64'))

const getDerivativeSignature = (
  urlSafeBase64EncodedPublicUri,
  serializedTransformations,
) => makeBase64UrlSafe(
  crypto.createHmac('sha256', PRIVATE_SIGNING_KEY).update(`${urlSafeBase64EncodedPublicUri}::${serializedTransformations}`).digest('base64'),
)

const generateImageSource = (publicUri, width, height, format) => {
  let appliedImageFormat
  const supportedImageFormats = ['jpeg', 'png', 'webp']

  const transformations = [
    `c_scale,width_${width},height_${height}`,
  ]

  if (supportedImageFormats.includes(format)) {
    transformations.push(`c_convert,extension_${format}`)
    appliedImageFormat = format
  } else {
    transformations.push('c_convert,extension_webp')
    appliedImageFormat = 'webp'
  }

  const urlSafeBase64EncodedPublicUri = urlSafeBase64(publicUri)
  const serializedTransformations = transformations.join('|')
  const drupalBaseUrl = process.env.DRUPAL_BASE_URL ?? 'https://dev-imagetransformapi.pantheonsite.io'

  return {
    src: `${drupalBaseUrl}/image-transformation-api/${urlSafeBase64EncodedPublicUri}/${serializedTransformations}?s=${getDerivativeSignature(urlSafeBase64EncodedPublicUri, serializedTransformations)}`,
    width,
    height,
    format: appliedImageFormat,
  }
}


const getBase64Image = () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HgAGgwJ/lK3Q6wAAAABJRU5ErkJggg=='

const resolveGatsbyImageData = async (mediaImage, options, context) => {
  // The `image` argument is the node to which you are attaching the resolver,
  // so the values will depend on your data type.
  const relatedFileNode = (
    context
      .nodeModel
      .getAllNodes({ type: 'file__file' })
      .filter((file) => file?.filename === mediaImage?.name)
  )?.[0]

  const filename = relatedFileNode?.uri?.value
  const sourceMetadata = {
    width: mediaImage?.field_media_image?.width,
    height: mediaImage?.field_media_image?.height,
    format: relatedFileNode?.filemime?.split('/')?.[1],
  }

  const imageDataArgs = {
    ...options,
    // Passing the plugin name allows for better error messages
    // This plugin name is inaccurate. This code could live as it's own
    // plugin in which case we'd add the real plugin name here.
    pluginName: 'gatsby-source-drupal',
    sourceMetadata,
    filename,
    generateImageSource,
    options,
  }

  // Generating placeholders is optional, but recommended
  if (options.placeholder === 'blurred') {
    // This function returns the URL for a 20px-wide image, to use as a blurred placeholder
    // You need to download the image and convert it to a base64-encoded data URI
    // const lowResImage = getLowResolutionImageURL(imageDataArgs)

    // This would be your own function to download and generate a low-resolution placeholder
    imageDataArgs.placeholderURL = await getBase64Image()
  }

  // You could also calculate dominant color, and pass that as `backgroundColor`
  // gatsby-plugin-sharp includes helpers that you can use to generate a tracedSVG or calculate
  // the dominant color of a local file, if you don't want to handle it in your plugin
  return generateImageData(imageDataArgs)
}

module.exports.createResolvers = ({ createResolvers }) => {
  createResolvers({
    // Here we add the gatsbyImageData resolver to `media__image` Gatsby nodes
    // We can do the same thing for any other Gatsby node type but using Media is recommended
    media__image: {
      gatsbyImageData: getGatsbyImageResolver(resolveGatsbyImageData),
    },
  })
}