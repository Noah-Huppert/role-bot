import {
  BaseComponentArgs,
  ComponentConstructor,
} from "./base";

/**
 * Function based options for component constructor.
 * @typeParam A - Actions map type
 * @typeParam P - Component properties type
 */
class ComponentOptionsBuilder<A, P> {
  actions?: A;
  props?: P;

  /**
   * Set the actions map for a component.
   */
  actions(actions: A): ComponentOptionsBuilder<A, P> {
    this.actions = actions;
    return this;
  }

  /**
   * Set the properties for a component.
   */
  props(props: P): ComponentOptionsBuilder<A, P> {
    this.props = props;
    return this;
  }

  /**
   * Verify all required arguments have been provided and return them.
   * @throws Error
   * If actions or props have not been provided.
   */
  collect(): ComponentOptions<A, P> {
    if (!this.actions) {
      throw new Error("Actions not set");
    }

    if (!this.props) {
      throw new Error("Properties not set");
    }

    return { actions, props };
  }
}

/**
 * Options to pass to a component's constructor.
 * @typeParam A - Actions map type
 * @typeParam P - Component properties type
 */
type ComponentOptions<A, P> {
  /**
   * Actions map.
   */
  actions: A;

  /**
   * Component properties
   */
  props: P;
}

/**
 * Makes initializing component classes easier by providing construtor arguments for you.
 */
export class ComponentFactory {
  /**
   * Arguments which base components need for their constructors.
   */
  args: BaseComponentArgs;

  constructor(args: BaseComponentArgs) {
    this.args = args;
  }

  /**
   * Initialize a component instance and call its render method.
   * @typeParam P - Component properties type
   * @typeParam A - Actions map type
   * @returns Discord Component Interaction action rows rendered by components.
   * @throws Error
   * If not all required opts values are provided. See {@link ComponentOptionsBuilder.collect}.
   */
  async hydrate<P, A>(cls: ComponentConstructor<A, P>, opts: (o: ComponentOptionsBuilder<A, P>) => ComponentOptionsBuilder<A, P>): Promise<MessageActionRow[]> {
    const optsValue = opts(new ComponentOptionsBuilder()).collect();
    const component = new cls(this.args, optsValue.actions, optsValue.props);
    return await component.render();
  }
}
