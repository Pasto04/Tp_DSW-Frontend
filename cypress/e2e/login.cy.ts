/// <reference types="cypress" />

/**
 * Test E2E real (sin stubs)
 *
 * Requisitos:
 * - Ejecutar contra un entorno de testing (no producción).
 * - Preferible exponer un endpoint de reset (ej: POST /test/reset) para dejar DB en estado conocido.
 * - En CI usar variables de entorno: CYPRESS_USER_EMAIL y CYPRESS_USER_PASS (accesibles dentro con Cypress.env('USER_EMAIL') y Cypress.env('USER_PASS')).
 * - Añadir data-cy en la app para elementos críticos (menu-ac, cuenta, logout) hará los tests más robustos.
 */

describe('Login E2E (real)', () => {
  const validEmail = Cypress.env('USER_EMAIL') || Cypress.env('CYPRESS_USER_EMAIL') || 'eren@gmail.com'
  const validPassword = Cypress.env('USER_PASS') || Cypress.env('CYPRESS_USER_PASS') || '123456'

  // Intentamos resetear el estado del backend (si existe el endpoint /test/reset)
  before(() => {
    const apiBase = Cypress.env('API_BASE') || Cypress.config('baseUrl') || 'http://localhost:4200'
    // ajustá la ruta /test/reset según lo que ofrezca tu backend de testing
    cy.request({
      method: 'POST',
      url: `${apiBase}/test/reset`,
      failOnStatusCode: false, // no romper si el endpoint no existe
    }).then((resp) => {
      // opcional: loguear para debugging
      cy.log('reset status', resp.status)
    })
  })

  beforeEach(() => {
    // mejor: definir baseUrl en cypress.config y usar cy.visit('/login')
    cy.visit('http://localhost:4200/login')
  })

  // helper: click en avatar/menú AC (usa data-cy si está, si no hace fallback)
  function openUserMenu() {
    cy.document().then((doc) => {
      if (doc.querySelector('[data-cy=menu-ac]')) {
        cy.get('[data-cy=menu-ac]').should('be.visible').click()
      } else {
        // fallback al selector visible actual
        cy.contains('button', /^AC$/, { timeout: 10000 }).should('be.visible').click()
      }
    })
  }

  // helper: ir a "Cuenta"
  function goToCuenta() {
    cy.document().then((doc) => {
      if (doc.querySelector('[data-cy=menu-cuenta]')) {
        cy.get('[data-cy=menu-cuenta]').should('be.visible').click()
      } else {
        cy.contains(/Cuenta/i, { timeout: 10000 }).should('be.visible').click()
      }
    })
  }

  // helper: click en logout (usa data-cy si existe)
  function clickLogout() {
    cy.document().then((doc) => {
      if (doc.querySelector('[data-cy=logout]')) {
        cy.get('[data-cy=logout]').should('be.visible').click()
      } else {
        cy.contains(/Cerrar Sesión|Cerrar sesión|Logout/i, { timeout: 10000 }).should('be.visible').click()
      }
    })
  }

  it('permite loguearse y luego cerrar sesión a través del menú lateral (E2E real)', () => {
    // Espiamos la request pero NO la stubeamos: la petición irá al backend real
    cy.intercept('POST', '**/api/usuarios/login').as('loginRequest')

    // Login por UI
    cy.get('input[name="email"], input[placeholder="Email"]', { timeout: 10000 })
      .clear()
      .type(validEmail)
    cy.get('input[name="password"], input[placeholder="Contraseña"], input[name="pwd"]', { timeout: 10000 })
      .clear()
      .type(validPassword)

    cy.contains(/Iniciar Sesión|Iniciar sesión|Log in/i).click()

    // Esperar la request del login y chequear status real del backend
    cy.wait('@loginRequest', { timeout: 20000 }).its('response.statusCode').should('eq', 200)

    // Asegurar que redirigió y dashboard cargó
    cy.url({ timeout: 10000 }).should('include', '/home')
    cy.contains('Alma Criolla', { timeout: 10000 }).should('be.visible')

    // Abrir menú lateral (avatar / AC)
    openUserMenu()

    // Entrar a Cuenta y hacer logout
    goToCuenta()
    clickLogout()

    // Comprobamos comportamiento post-logout:
    // - puede redirigir a /login o a /home público; aceptamos ambas, pero además verificamos que
    //   el token se eliminó y que no hay elementos de usuario visibles (avatar).
    cy.url({ timeout: 10000 }).should((url) => {
      expect(url).to.satisfy((u:any) => u.includes('/login') || u.includes('/home'))
    })

    // token eliminado
    cy.window().then((win) => {
      const token =
        win.localStorage.getItem('authToken') ||
        win.localStorage.getItem('token') ||
        win.localStorage.getItem('accessToken')
      expect(token, 'token removed after logout').to.be.oneOf([null, undefined])
    })
  })



  it('muestra error con credenciales inválidas (E2E real - backend devuelve 404)', () => {
    // Espiamos la request pero no la stubeamos: la petición irá al backend real
    cy.intercept('POST', '**/api/usuarios/login').as('badLogin')

    // Capturamos alert nativo si la app lo usa (no uses cy.* dentro del callback)
    cy.on('window:alert', (text) => {
      expect(text).to.match(/El mail ingresado no se encuentra registrado|Credenciales incorrectas|error/i)
    })

    cy.get('input[name="email"], input[placeholder="Email"]').clear().type('wrong@gmail.com')
    cy.get('input[name="password"], input[placeholder="Contraseña"], input[name="password"]').clear().type('wrongpass')

    cy.contains(/Iniciar Sesión|Log in/i).click()

    // Esperamos la petición real y comprobamos que el backend devolvió 404 (según lo que me dijiste)
    cy.wait('@badLogin', { timeout: 15000 }).its('response.statusCode').should('eq', 404)

    // Verificar que seguimos en /login (o la ruta que corresponda)
    cy.url().should('include', '/login')

    // Si tu app muestra el mensaje en DOM en lugar de alert nativo, descomenta y ajusta:
    // cy.contains(/El mail ingresado no se encuentra registrado|Credenciales incorrectas/i, { timeout: 10000 }).should('be.visible')
  })
})