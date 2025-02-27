/**
 * A simple formula parser for table cell calculations.
 * This is a basic implementation that could be expanded with more functions and operators.
 */

// Available formula functions
const FORMULA_FUNCTIONS = {
  SUM: (args) => args.reduce((sum, val) => sum + (parseFloat(val) || 0), 0),
  AVG: (args) => {
    if (args.length === 0) return 0;
    return FORMULA_FUNCTIONS.SUM(args) / args.length;
  },
  MIN: (args) => Math.min(...args.map(val => parseFloat(val) || 0)),
  MAX: (args) => Math.max(...args.map(val => parseFloat(val) || 0)),
  COUNT: (args) => args.length,
  IF: (args) => {
    if (args.length < 3) return null;
    return evaluateCondition(args[0]) ? args[1] : args[2];
  },
};

// Helper to evaluate conditions for IF formulas
const evaluateCondition = (condition) => {
  if (typeof condition === 'boolean') return condition;
  if (typeof condition === 'string') {
    // Handle string comparisons like "value1=value2"
    if (condition.includes('=')) {
      const [left, right] = condition.split('=');
      return left.trim() === right.trim();
    }
    // Handle string comparisons like "value1>value2"
    if (condition.includes('>')) {
      const [left, right] = condition.split('>');
      return parseFloat(left.trim()) > parseFloat(right.trim());
    }
    // Handle string comparisons like "value1<value2"
    if (condition.includes('<')) {
      const [left, right] = condition.split('<');
      return parseFloat(left.trim()) < parseFloat(right.trim());
    }
  }
  return Boolean(condition);
};

/**
 * Parses and evaluates a formula string using row data.
 * @param {string} formula - Formula string (e.g., "=SUM(field1,field2)")
 * @param {Object} rowData - Row data object containing field values
 * @returns {number|string} - Result of formula evaluation
 */
export const evaluateFormula = (formula, rowData) => {
  if (!formula || typeof formula !== 'string' || !formula.startsWith('=')) {
    return formula;
  }

  try {
    // Extract the function name and arguments
    const functionMatch = formula.match(/^=([A-Z]+)\((.*)\)$/);
    if (!functionMatch) {
      return formula; // Not a valid formula format
    }

    const [, functionName, argsString] = functionMatch;
    const func = FORMULA_FUNCTIONS[functionName];
    
    if (!func) {
      return `Unknown function: ${functionName}`;
    }

    // Parse the arguments and replace field references with actual values
    const args = argsString.split(',').map(arg => {
      const trimmed = arg.trim();
      
      // If the argument is a field reference, get the value from rowData
      if (rowData && rowData[trimmed] !== undefined) {
        return rowData[trimmed];
      }
      
      // Check if it's a nested formula
      if (trimmed.startsWith('=')) {
        return evaluateFormula(trimmed, rowData);
      }
      
      // Otherwise, it's a literal value
      return trimmed;
    });

    // Execute the formula function with the arguments
    return func(args);
  } catch (error) {
    console.error('Formula evaluation error:', error);
    return 'Error';
  }
};

/**
 * Checks if a cell formula has circular references.
 * @param {string} formula - The formula to check
 * @param {string} fieldName - The current field name
 * @returns {boolean} - True if circular reference is detected
 */
export const hasCircularReference = (formula, fieldName) => {
  if (!formula || typeof formula !== 'string') return false;
  
  const fieldRegex = new RegExp(`\\b${fieldName}\\b`);
  return fieldRegex.test(formula);
};

/**
 * Gets a list of fields that a formula depends on.
 * @param {string} formula - The formula to analyze
 * @param {Array<string>} allFields - List of all available fields
 * @returns {Array<string>} - List of field dependencies
 */
export const getFormulaDependencies = (formula, allFields) => {
  if (!formula || typeof formula !== 'string' || !allFields) return [];
  
  const dependencies = [];
  
  allFields.forEach(field => {
    const fieldRegex = new RegExp(`\\b${field}\\b`);
    if (fieldRegex.test(formula)) {
      dependencies.push(field);
    }
  });
  
  return dependencies;
};

export default {
  evaluateFormula,
  hasCircularReference,
  getFormulaDependencies,
};