/**
 * Utility for Prompt Quality Evaluation
 */
const PromptQuality = {
    /**
     * Revisa la longitud del prompt para evitar desbordes de tokens o límites de la API.
     * @param {string} prompt 
     * @returns {Object} { healthy: boolean, reason: string }
     */
    checkLength: function (prompt) {
        const charLimit = 25000; // Límite preventivo para GLM-4 Flash
        const len = prompt.length;
        if (len > charLimit) {
            return {
                healthy: false,
                reason: `Crítico: Prompt demasiado extenso (${len} caracteres). Riesgo de rechazo por la API.`
            };
        }
        return { healthy: true, val: len };
    },

    /**
     * Verifica que el contexto JSON inyectado sea válido y no esté corrupto.
     * @param {Object} context 
     * @returns {Object} { healthy: boolean, reason: string }
     */
    checkContextIntegrity: function (context) {
        if (!context || typeof context !== 'object') {
            return { healthy: false, reason: 'Error: El contexto operativo es nulo o inválido.' };
        }
        if (!context.comuna || context.comuna === '--') {
            return { healthy: false, reason: 'Advertencia: Falta identificación de Comuna en el contexto.' };
        }
        return { healthy: true };
    },

    /**
     * Evalúa si el prompt contiene las 25 vistas obligatorias.
     * @param {string} prompt 
     * @returns {Object} { healthy: boolean, reason: string }
     */
    checkCoverage: function (prompt) {
        const missing = [];
        for (let i = 1; i <= 25; i++) {
            if (!prompt.includes(`vista${i}:`)) {
                missing.push(`vista${i}`);
            }
        }
        if (missing.length > 0) {
            return {
                healthy: false,
                reason: `Incompleto: Faltan las siguientes preguntas: ${missing.join(', ')}.`
            };
        }
        return { healthy: true };
    },

    /**
     * Calcula una estimación aproximada del tiempo y longitud de la respuesta esperada
     * basada en la heurística de que le pedimos 25 respuestas de ~30 palabras.
     */
    estimateResponseLength: function () {
        // Asumiendo 25 vistas, a ~25 palabras en español por vista = ~625 palabras.
        // Un token en español aprox ~4 a 5 caracteres.
        const expectedWords = 25 * 30; // Maximo 750 palabras
        const expectedChars = expectedWords * 6; // ~4500 caracteres

        return {
            words: expectedWords,
            chars: expectedChars,
            tokens: Math.ceil(expectedChars / 4) // aproximación rústica de GLM tokenizer
        };
    },

    /**
     * Ejecuta una auditoría completa y muestra métricas clave.
     */
    audit: function (prompt, context) {
        const lenCheck = this.checkLength(prompt);
        const ctxCheck = this.checkContextIntegrity(context);
        const covCheck = this.checkCoverage(prompt);

        const results = [lenCheck, ctxCheck, covCheck];
        const fails = results.filter(r => !r.healthy);

        const estimation = this.estimateResponseLength();

        // Imprimir Estadísticas Reales (Métricas)
        console.group('📊 AUDITORÍA DE PROMPT: Estadísticas Clave');
        console.log(`- Longitud Input (Prompt enviado): ${prompt.length} caracteres`);
        console.log(`- Tamaño Contexto Operativo: ${JSON.stringify(context).length} bytes`);
        console.log(`- Vistas a procesar: 25 Obligatorias`);
        if (context.comuna) console.log(`- Comuna Detectada: ${context.comuna}`);

        console.groupEnd();

        console.group('⏱️ ESTIMACIÓN DE OUTPUT ESPERADO');
        console.log(`- Longitud estimada de respuesta: ~${estimation.chars} caracteres`);
        console.log(`- Palabras aprox: ~${estimation.words} palabras`);
        console.log(`- Tokens de Output (GLM-4): ~${estimation.tokens} tokens`);
        console.groupEnd();

        if (fails.length > 0) {
            console.group('⚠️ AUDITORÍA DE PROMPT: Falla Detectada');
            fails.forEach(f => console.warn('❌', f.reason));
            console.groupEnd();
            return false;
        }

        console.log('✅ AUDITORÍA DE PROMPT: Salud Confirmada.');
        return true;
    }
};

// Exportar al scope global
window.PromptQuality = PromptQuality;
