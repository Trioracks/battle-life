import test from 'node:test';
import assert from 'node:assert/strict';

async function loadPlan() {
  try {
    return await import('../src/avatar-model-plan.js');
  } catch (error) {
    assert.fail(`The 3D avatar plan is unavailable: ${error.message}`);
  }
}

test('the playable avatar is defined as a physical 3D rig, not a sprite', async () => {
  const { avatarModelPlan } = await loadPlan();
  const plan = avatarModelPlan({ hair: 'crop', face: 'clean', top: 'jacket', pants: 'cargo' });

  assert.equal(plan.representation, 'three-mesh-rig');
  assert.deepEqual(plan.parts.map((part) => part.id), ['torso', 'head', 'ear-left', 'ear-right', 'arm-left', 'arm-right', 'leg-left', 'leg-right']);
  for (const part of plan.parts) {
    assert.equal(part.size.length, 3, `${part.id} has width, height and depth`);
    assert.ok(part.size.every((value) => value > 0), `${part.id} has physical volume`);
  }
});

test('the model keeps one complete body through all four cardinal rotations', async () => {
  const { avatarModelPlan, avatarFacingAtYaw } = await loadPlan();
  const plan = avatarModelPlan();

  assert.equal(plan.parts.filter((part) => part.id === 'head').length, 1);
  assert.equal(plan.parts.filter((part) => part.id.startsWith('arm-')).length, 2);
  assert.equal(plan.parts.filter((part) => part.id.startsWith('leg-')).length, 2);
  assert.deepEqual(
    [0, Math.PI / 2, Math.PI, -Math.PI / 2].map(avatarFacingAtYaw),
    ['front', 'profile-right', 'back', 'profile-left'],
  );
});
