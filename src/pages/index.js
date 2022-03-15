import * as React from "react"
import { graphql, Link, useStaticQuery } from "gatsby"
import { GatsbyImage } from "gatsby-plugin-image"

import Layout from "../components/layout"
import Seo from "../components/seo"

const IndexPage = () => {
  const queryData = useStaticQuery(graphql`
    {
      allNodeArticle {
        nodes {
          relationships {
            field_media {
              gatsbyImageData(width: 200)
            }
          }
        }
      }
    }
  `)

  const image = queryData?.allNodeArticle?.nodes?.[0]?.relationships?.field_media?.[0]?.gatsbyImageData
  
  return (
    <Layout>
      <Seo title="Home" />
      <h1>Hi people</h1>
      <p>Welcome to your new Gatsby site.</p>
      <p>Now go build something great.</p>
      <GatsbyImage image={image} />
      <p>
        <Link to="/page-2/">Go to page 2</Link> <br />
        <Link to="/using-typescript/">Go to "Using TypeScript"</Link> <br />
        <Link to="/using-ssr">Go to "Using SSR"</Link> <br />
        <Link to="/using-dsg">Go to "Using DSG"</Link>
      </p>
    </Layout>
  )
}

export default IndexPage
