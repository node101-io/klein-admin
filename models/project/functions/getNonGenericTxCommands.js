const DEFAULT_TX_COMMANDS = [
  'create_validator',
  'delegate_token',
  'edit_validator',
  'redelegate_token',
  'send_token',
  'undelegate_token',
  'unjail_validator',
  'vote_proposal',
  'withdraw_rewards'
];

module.exports = data => {
  const non_generic_tx_commands = [];

  if (!data || !Array.isArray(data))
    return non_generic_tx_commands;

  data.forEach(command => {
    if (typeof command == 'string' && DEFAULT_TX_COMMANDS.includes(command))
      non_generic_tx_commands.push(command);
  });

  return non_generic_tx_commands;
};