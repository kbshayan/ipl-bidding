import serverless from 'serverless-http'

let cachedHandler

async function getHandler() {
    if (cachedHandler) return cachedHandler

    // Ensure writable uploads path in Netlify Lambda runtime.
    process.env.NETLIFY = process.env.NETLIFY || 'true'
    process.env.UPLOAD_DIR = process.env.UPLOAD_DIR || '/tmp/uploads'

    const [{ connectDb }, { createApp }, { seedInitialData }] = await Promise.all([
        import ('../../backend/src/config/db.js'),
        import ('../../backend/src/app.js'),
        import ('../../backend/src/utils/seed.js'),
    ])

    await connectDb()
    await seedInitialData()

    const app = createApp()
        // Don't use basePath - Netlify redirect handles the path routing
    cachedHandler = serverless(app)

    return cachedHandler
}

export const handler = async(event, context) => {
    try {
        const appHandler = await getHandler()
        return appHandler(event, context)
    } catch (error) {
        console.error('Function error:', error)
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error', error: error.message }),
        }
    }
}