const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MediRec API',
      version: '2.0',
      description: 'Medical Recommendation System API with 155+ diseases, appointments, notifications, and more.',
      contact: {
        name: 'MediRec Team',
        url: 'http://localhost:5000',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./server/routes/*.js'],
};

const specs = swaggerJsdoc(options);

const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
  console.log('📚 Swagger docs available at http://localhost:5000/api-docs');
};

module.exports = { setupSwagger };
