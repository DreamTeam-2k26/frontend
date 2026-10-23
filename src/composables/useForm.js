import { reactive } from 'vue'

/**
 * Estado e validação de formulário.
 * @param {Record<string, any>} initialValues
 * @param {Record<string, Array<(value: any, values: Record<string, any>) => string>>} rules
 */
export function useForm(initialValues, rules = {}) {
  const values = reactive({ ...initialValues })
  const errors = reactive(Object.fromEntries(Object.keys(initialValues).map((key) => [key, ''])))

  function validateField(name) {
    const fieldRules = rules[name] ?? []
    errors[name] = fieldRules.map((rule) => rule(values[name], values)).find(Boolean) ?? ''
    return !errors[name]
  }

  function validate() {
    return Object.keys(rules)
      .map(validateField)
      .every(Boolean)
  }

  // Chama onValid com cópia dos valores só se tudo for válido.
  function handleSubmit(onValid) {
    return () => {
      if (validate()) onValid({ ...values })
    }
  }

  return { values, errors, validateField, handleSubmit }
}
