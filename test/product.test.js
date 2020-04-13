const app = require('../app')
const request = require('supertest')
const { sequelize } = require('../models')
const { queryInterface } = sequelize
const { encrypt } = require('../helpers/bcrypt')
let currentToken = ''
let currentProdId = 0
let currentuserId = 0

const userTest = {
    email: 'testing@mail.com',
    password: '123456789'
  };
const currentProduct = {
    name: 'orange fruit',
    image_url: 'https://google.com',
    price: 20000
}


afterAll((done) => {
    queryInterface.bulkDelete('Users')
    .then((result) => {
        return queryInterface.bulkDelete('Products')
    })
    .then((result) => {
        console.log('Db clean up users....')
        done()
    })
    .catch((err) => {
        done(err)
    });
})

beforeAll(done => {
    const newPass = encrypt(userTest.password)
    queryInterface
      .bulkInsert('Users', [
        {
          email: userTest.email,
          password: newPass,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ])
      .then((result) => {
        console.log('User created: ' + userTest.email);
        done();
      })
      .catch(err => {
        done(err);
      });
  });


  describe('Product services', () => {
    describe('success add product', () => {
        test('should return object with properties access token, id, email and status code 200', (done) => {
            request(app)
            .post('/users/login')
            .send(userTest)
            .end((err, response) => {
                if (err) {
                    console.log(err)
                    return done(err)
                } else {
                    currentuserId = response.body.id
                    currentToken = response.body.token
                    console.log(currentToken)
                    expect(response.status).toBe(200);
                    expect(response.body).toHaveProperty('token');
                    return done()
                }
            })
        });     


        test('should return object with properties id, name, price, image_url and status code 201', (done) => {
            request(app)
            .post('/products')
            .set({ 'access_token': currentToken })
            .send(currentProduct)
            .end((err, response) => {
                if (err) {
                    console.log(err)
                    return done(err)
                } else {
                    currentProdId = response.body.id
                    expect(response.status).toBe(201)
                    expect(response.body).toHaveProperty('id', expect.any(Number))
                    expect(response.body).toHaveProperty('name', currentProduct.name)
                    expect(response.body).toHaveProperty('image_url', currentProduct.image_url)
                    expect(response.body).toHaveProperty('price', currentProduct.price)
                    expect(response.body).toHaveProperty('userId', currentuserId)
                    return done()
                }
            })
        });

        test('should return array of object with properties id, name, price, image_url and status code 200', (done) => {
            const products = [
                {
                    id: currentProdId,
                    name: currentProduct.name,
                    image_url: currentProduct.image_url,
                    price: currentProduct.price,
                    userId: currentuserId
                }
            ]
            request(app)
            .get(`/products`)
            .set({ 'access_token': currentToken })
            .end((err, response) => {
                if (err) {
                    console.log(err)
                    return done(err)
                } else {
                    expect(response.status).toBe(200)
                    expect(response.body).toHaveProperty('products', products)
                    return done()
                }
            })
        });

        test('should return object with properties update message and status code 200', (done) => {
            const message = 'Data successfully updated'
            request(app)
            .patch(`/products/${currentProdId}`)
            .set({ 'access_token': currentToken })
            .send({
                name: 'red orange fruits',
                image_url: 'http://facebook.com',
                price: 40000
            })
            .end((err, response) => {
                if (err) {
                    console.log(err)
                    return done(err)
                } else {
                    expect(response.status).toBe(200)
                    expect(response.body).toHaveProperty('message', message)
                    return done()
                }
            })
        });

        test('should return object with properties delete message and status code 200', (done) => {
            const message = 'Data successfully deleted'
            request(app)
            .delete(`/products/${currentProdId}`)
            .set({ 'access_token': currentToken })
            .end((err, response) => {
                if (err) {
                    console.log(err)
                    return done(err)
                } else {
                    expect(response.status).toBe(200)
                    expect(response.body).toHaveProperty('message', message)
                    return done()
                }
            })
        });
    });

    describe('errors auhtentication', () => {
        test('should return with status code 500 because error of Jsonwebtoken error malformed', (done) => {
            const errors = [{ message: 'jwt malformed'}]
            request(app)
            .get('/products')
            .set({'access_token': 'asdasfasfasfsafa'})
            .end((err, response) => {
                if (err) {
                    console.log(err)
                    return done(err)
                } else {
                    expect(response.status).toBe(500)
                    return done()
                }
            })
        });
    });

    describe('errors auhtorization', () => {
        test('should return error with status code 404 because server cannot find searched product', (done) => {
            const errors = [{ message: 'Data Product Not Found' }]
            request(app)
            .delete('/products/2987')
            .set({'access_token': currentToken})
            .end((err, response) => {
                if (err) {
                    console.log(err)
                    return done(err)
                } else {
                    expect(response.status).toBe(404)
                    expect(response.body).toHaveProperty('errors', errors)
                    return done(err)
                }
            })
        });

        
    });

    describe('errors validation', () => {
        test('should return error with status code 400 because not empty validation has been violated', (done) => {
            const errors = [
                {
                    message: 'Name is required field'
                },
                {
                    message: 'Image_url is required field'
                },
                {
                    message: 'Price is required field'
                }
            ]
            request(app)
            .post('/products')
            .set({'access_token': currentToken})
            .end((err, response) => {
                if (err) {
                    console.log(err)
                    return done(err)
                } else {
                    expect(response.status).toBe(400)
                    expect(response.body).toHaveProperty('errors', errors)
                    return done()
                }
            })
        });        

        test('should return error with status code 400 because price validation has been violated', (done) => {
            const errors = [{ message: 'Price must be greater than 0' }]
            request(app)
            .post('/products')
            .set({'access_token': currentToken})
            .send({
                name: 'mango',
                image_url: 'http://twitter.com',
                price: -1
            })
            .end((err, response) => {
                if (err) {
                    console.log(err)
                    return done(err)
                } else {
                    expect(response.status).toBe(400)
                    expect(response.body).toHaveProperty('errors', errors)
                    return done()
                }
            })
        });        


         test('should return error with status code 400 because image_url validation has been violated', (done) => {
            const errors = [{ message: 'this field must be url like' }]
            request(app)
            .post('/products')
            .set({'access_token': currentToken})
            .send({
                name: 'mango',
                image_url: 'twitterom',
                price: 10000
            })
            .end((err, response) => {
                if (err) {
                    console.log(err)
                    return done(err)
                } else {
                    expect(response.status).toBe(400)
                    expect(response.body).toHaveProperty('errors', errors)
                    return done()
                }
            })
        });        

    });

  });