// Lightweight Neural Network for DQN
// No external dependencies - pure TypeScript implementation
// Supports feedforward networks with ReLU/tanh activations

/**
 * Activation function types
 */
export type ActivationFunction = 'relu' | 'tanh' | 'sigmoid' | 'linear';

/**
 * Network layer definition
 */
export interface LayerDef {
  size: number;
  activation: ActivationFunction;
}

/**
 * Serializable network state
 */
export interface NetworkState {
  weights: number[][][];
  biases: number[][];
  layerDefs: LayerDef[];
  inputSize: number;
}

/**
 * Apply activation function
 */
function activate(x: number, fn: ActivationFunction): number {
  switch (fn) {
    case 'relu': return Math.max(0, x);
    case 'tanh': return Math.tanh(x);
    case 'sigmoid': return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
    case 'linear': return x;
  }
}

/**
 * Derivative of activation function
 */
function activateDerivative(output: number, fn: ActivationFunction): number {
  switch (fn) {
    case 'relu': return output > 0 ? 1 : 0;
    case 'tanh': return 1 - output * output;
    case 'sigmoid': return output * (1 - output);
    case 'linear': return 1;
  }
}

/**
 * Simple feedforward neural network with backpropagation.
 *
 * Designed for DQN use cases where:
 * - Input: continuous state features (price, volume, etc.)
 * - Output: Q-value for each action
 * - Training: MSE loss via gradient descent
 *
 * Typical architecture for DAO agents:
 *   Input(8) → Dense(32, relu) → Dense(16, relu) → Output(numActions, linear)
 */
export class NeuralNetwork {
  private weights: number[][][]; // [layer][output_neuron][input_neuron]
  private biases: number[][];    // [layer][neuron]
  private layerDefs: LayerDef[];
  private inputSize: number;

  // Cached forward pass results for backprop
  private layerOutputs: number[][] = [];
  private layerInputs: number[][] = [];

  constructor(inputSize: number, layers: LayerDef[]) {
    this.inputSize = inputSize;
    this.layerDefs = layers;
    this.weights = [];
    this.biases = [];

    // Initialize weights with Xavier/He initialization
    let prevSize = inputSize;
    for (const layer of layers) {
      const scale = Math.sqrt(2.0 / prevSize); // He init for ReLU
      const layerWeights: number[][] = [];
      const layerBiases: number[] = [];

      for (let i = 0; i < layer.size; i++) {
        const neuronWeights: number[] = [];
        for (let j = 0; j < prevSize; j++) {
          neuronWeights.push((Math.random() * 2 - 1) * scale);
        }
        layerWeights.push(neuronWeights);
        layerBiases.push(0);
      }

      this.weights.push(layerWeights);
      this.biases.push(layerBiases);
      prevSize = layer.size;
    }
  }

  /**
   * Forward pass through the network
   */
  forward(input: number[]): number[] {
    if (input.length !== this.inputSize) {
      throw new Error(`Expected input size ${this.inputSize}, got ${input.length}`);
    }

    this.layerInputs = [input];
    this.layerOutputs = [];

    let current = input;
    for (let l = 0; l < this.weights.length; l++) {
      const nextSize = this.layerDefs[l].size;
      const activation = this.layerDefs[l].activation;
      const next: number[] = new Array(nextSize);

      for (let i = 0; i < nextSize; i++) {
        let sum = this.biases[l][i];
        for (let j = 0; j < current.length; j++) {
          sum += this.weights[l][i][j] * current[j];
        }
        next[i] = activate(sum, activation);
      }

      this.layerOutputs.push(next);
      if (l < this.weights.length - 1) {
        this.layerInputs.push(next);
      }
      current = next;
    }

    return current;
  }

  /**
   * Backward pass: compute gradients and update weights
   *
   * @param targets - Target output values
   * @param learningRate - Step size for gradient descent
   * @returns MSE loss
   */
  backward(targets: number[], learningRate: number): number {
    const outputLayer = this.layerOutputs[this.layerOutputs.length - 1];
    const numLayers = this.weights.length;

    // Compute output layer error (MSE derivative: 2*(output - target))
    let deltas: number[][] = [];
    const outputDelta: number[] = new Array(outputLayer.length);
    let loss = 0;

    for (let i = 0; i < outputLayer.length; i++) {
      const error = outputLayer[i] - targets[i];
      loss += error * error;
      const deriv = activateDerivative(outputLayer[i], this.layerDefs[numLayers - 1].activation);
      outputDelta[i] = error * deriv;
    }
    loss /= outputLayer.length;
    deltas.push(outputDelta);

    // Backpropagate through hidden layers
    for (let l = numLayers - 2; l >= 0; l--) {
      const layerOutput = this.layerOutputs[l];
      const nextDelta = deltas[deltas.length - 1];
      const delta: number[] = new Array(layerOutput.length);

      for (let i = 0; i < layerOutput.length; i++) {
        let errorSum = 0;
        for (let j = 0; j < nextDelta.length; j++) {
          errorSum += nextDelta[j] * this.weights[l + 1][j][i];
        }
        const deriv = activateDerivative(layerOutput[i], this.layerDefs[l].activation);
        delta[i] = errorSum * deriv;
      }
      deltas.push(delta);
    }

    // Reverse deltas to match layer order
    deltas = deltas.reverse();

    // Update weights and biases
    for (let l = 0; l < numLayers; l++) {
      const input = this.layerInputs[l];
      const delta = deltas[l];

      for (let i = 0; i < delta.length; i++) {
        for (let j = 0; j < input.length; j++) {
          this.weights[l][i][j] -= learningRate * delta[i] * input[j];
        }
        this.biases[l][i] -= learningRate * delta[i];
      }
    }

    return loss;
  }

  /**
   * Get output size (number of output neurons)
   */
  getOutputSize(): number {
    return this.layerDefs[this.layerDefs.length - 1].size;
  }

  /**
   * Get input size
   */
  getInputSize(): number {
    return this.inputSize;
  }

  /**
   * Get total parameter count
   */
  getParameterCount(): number {
    let count = 0;
    for (let l = 0; l < this.weights.length; l++) {
      for (const neuron of this.weights[l]) {
        count += neuron.length;
      }
      count += this.biases[l].length;
    }
    return count;
  }

  /**
   * Soft-update from another network: θ_target = τ*θ_online + (1-τ)*θ_target
   */
  softUpdate(source: NeuralNetwork, tau: number): void {
    for (let l = 0; l < this.weights.length; l++) {
      for (let i = 0; i < this.weights[l].length; i++) {
        for (let j = 0; j < this.weights[l][i].length; j++) {
          this.weights[l][i][j] =
            tau * source.weights[l][i][j] + (1 - tau) * this.weights[l][i][j];
        }
        this.biases[l][i] =
          tau * source.biases[l][i] + (1 - tau) * this.biases[l][i];
      }
    }
  }

  /**
   * Copy weights from another network
   */
  copyFrom(source: NeuralNetwork): void {
    for (let l = 0; l < this.weights.length; l++) {
      for (let i = 0; i < this.weights[l].length; i++) {
        for (let j = 0; j < this.weights[l][i].length; j++) {
          this.weights[l][i][j] = source.weights[l][i][j];
        }
        this.biases[l][i] = source.biases[l][i];
      }
    }
  }

  /**
   * Export network state
   */
  exportState(): NetworkState {
    return {
      weights: JSON.parse(JSON.stringify(this.weights)),
      biases: JSON.parse(JSON.stringify(this.biases)),
      layerDefs: JSON.parse(JSON.stringify(this.layerDefs)),
      inputSize: this.inputSize,
    };
  }

  /**
   * Import network state
   */
  importState(state: NetworkState): void {
    this.weights = JSON.parse(JSON.stringify(state.weights));
    this.biases = JSON.parse(JSON.stringify(state.biases));
  }

  /**
   * Create a network from saved state
   */
  static fromState(state: NetworkState): NeuralNetwork {
    const net = new NeuralNetwork(state.inputSize, state.layerDefs);
    net.importState(state);
    return net;
  }
}
